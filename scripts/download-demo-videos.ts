import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { getStorageProvider, saveFile } from "../lib/storage";

type VideoSource = {
  id: string;
  url: string;
};

const demoSources: VideoSource[] = [
  {
    id: "big-buck-bunny",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    id: "elephants-dream",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  },
  {
    id: "for-bigger-blazes",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: "for-bigger-escapes",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    id: "for-bigger-fun",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  },
  {
    id: "for-bigger-joyrides",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  },
  {
    id: "for-bigger-meltdowns",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
  },
  {
    id: "sintel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
  },
  {
    id: "subaru-outback",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"
  },
  {
    id: "tears-of-steel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
  },
  {
    id: "we-are-going-on-bullrun",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
  },
  {
    id: "what-car-can-you-get",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4"
  }
];

const durationSeconds = Number.parseInt(process.env.DEMO_VIDEO_DURATION_SECONDS || "15", 10);
const force = process.argv.includes("--force");
const posterSize = { width: 600, height: 900 };
const backdropSize = { width: 1280, height: 720 };
const frameTimestampSeconds = 2;
const allowS3Upload = process.env.DEMO_UPLOAD_TO_S3 === "true";

function shouldUploadToS3() {
  if (!allowS3Upload) {
    return false;
  }
  return getStorageProvider() === "s3";
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function downloadFile(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const body = response.body as unknown as WebReadableStream<Uint8Array>;
  await pipeline(Readable.fromWeb(body), createWriteStream(outputPath));
}

async function uploadToStorage(relativePath: string, absolutePath: string, mimeType: string) {
  if (!shouldUploadToS3()) {
    return;
  }
  const normalized = normalizeRelativePath(relativePath);
  const data = await fs.readFile(absolutePath);
  await saveFile({
    data,
    filename: path.posix.basename(normalized),
    mimeType,
    folder: "",
    relativePath: normalized
  });
}

async function transcodeShort(inputPath: string, outputPath: string) {
  if (durationSeconds <= 0) {
    await fs.rename(inputPath, outputPath);
    return;
  }

  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-t",
    `${durationSeconds}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "-shortest",
    outputPath
  ]);

  await fs.rm(inputPath, { force: true });
}

function formatTimestamp(seconds: number) {
  const clamped = Math.max(0, seconds);
  const whole = Math.floor(clamped);
  const ms = Math.round((clamped - whole) * 1000);
  const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const ss = String(whole % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(ms).padStart(3, "0")}`;
}

async function extractImage({
  inputPath,
  outputPath,
  width,
  height,
  timestampSeconds
}: {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  timestampSeconds: number;
}) {
  await runFfmpeg([
    "-y",
    "-ss",
    formatTimestamp(timestampSeconds),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=w=${width}:h=${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
    "-q:v",
    "2",
    outputPath
  ]);
}

async function main() {
  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const outputDir = path.resolve(baseDir, "demos");
  await fs.mkdir(outputDir, { recursive: true });

  for (const source of demoSources) {
    const videoName = `open-${source.id}.mp4`;
    const targetPath = path.join(outputDir, videoName);
    const videoRelativePath = path.posix.join("demos", videoName);
    const videoExists = await fileExists(targetPath);
    if (!videoExists || force) {
      const tmpPath = path.join(outputDir, `.download-${source.id}.mp4`);
      console.log(`Downloading ${source.url}`);
      await downloadFile(source.url, tmpPath);
      await transcodeShort(tmpPath, targetPath);
      console.log(`Saved ${targetPath}`);
    } else {
      console.log(`Using existing video: ${targetPath}`);
    }
    await uploadToStorage(videoRelativePath, targetPath, "video/mp4");

    const posterName = `open-poster-${source.id}.jpg`;
    const posterPath = path.join(outputDir, posterName);
    const posterRelativePath = path.posix.join("demos", posterName);
    if (force || !(await fileExists(posterPath))) {
      await extractImage({
        inputPath: targetPath,
        outputPath: posterPath,
        width: posterSize.width,
        height: posterSize.height,
        timestampSeconds: frameTimestampSeconds
      });
      console.log(`Saved ${posterPath}`);
    }
    await uploadToStorage(posterRelativePath, posterPath, "image/jpeg");

    const backdropName = `open-backdrop-${source.id}.jpg`;
    const backdropPath = path.join(outputDir, backdropName);
    const backdropRelativePath = path.posix.join("demos", backdropName);
    if (force || !(await fileExists(backdropPath))) {
      await extractImage({
        inputPath: targetPath,
        outputPath: backdropPath,
        width: backdropSize.width,
        height: backdropSize.height,
        timestampSeconds: frameTimestampSeconds
      });
      console.log(`Saved ${backdropPath}`);
    }
    await uploadToStorage(backdropRelativePath, backdropPath, "image/jpeg");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
