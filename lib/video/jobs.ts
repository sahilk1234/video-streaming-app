import fs from "fs/promises";
import os from "os";
import path from "path";
import mime from "mime-types";
import { AssetKind, MediaJobStatus, StorageProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAssetLocalPath, saveFile } from "@/lib/storage";
import { downloadFromS3 } from "@/lib/storage/s3";
import { createHlsAndThumbnail } from "@/lib/video/ffmpeg";

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function mapStorageProvider(storage: string): StorageProvider {
  return storage === "s3" ? StorageProvider.S3 : StorageProvider.LOCAL;
}

export async function processMediaJob(jobId: string) {
  const job = await prisma.mediaJob.findUnique({
    where: { id: jobId },
    include: { inputAsset: true }
  });

  if (!job) {
    throw new Error("Media job not found");
  }

  if (job.status === MediaJobStatus.PROCESSING) {
    return job;
  }

  await prisma.mediaJob.update({
    where: { id: jobId },
    data: { status: MediaJobStatus.PROCESSING, errorMessage: null }
  });

  console.log(`[media-job] processing ${jobId}`);

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), `job-${jobId}-`));
  const outputDir = path.join(tmpRoot, "output");

  try {
    let inputPath = getAssetLocalPath(job.inputAsset);
    if (!inputPath) {
      inputPath = path.join(tmpRoot, "input.mp4");
      await downloadFromS3(job.inputAsset.pathOrUrl, inputPath);
    }

    const result = await createHlsAndThumbnail(inputPath, outputDir);

    const hlsRoot = path.join(outputDir, "hls");
    const hlsFiles = await listFiles(hlsRoot);

    let masterStoredPath: string | null = null;
    let masterStorage: string | null = null;
    const storageFolder = `hls/${job.id}`;

    for (const filePath of hlsFiles) {
      const relativePath = path.relative(hlsRoot, filePath).split(path.sep).join("/");
      const data = await fs.readFile(filePath);
      const stored = await saveFile({
        data,
        filename: path.basename(filePath),
        mimeType: mime.lookup(filePath) || "application/octet-stream",
        folder: storageFolder,
        relativePath
      });
      if (relativePath === "master.m3u8") {
        masterStoredPath = stored.path;
        masterStorage = stored.storage;
      }
    }

    if (!masterStoredPath) {
      throw new Error("HLS master playlist missing");
    }

    const thumbData = await fs.readFile(result.thumbnailPath);
    const thumbStored = await saveFile({
      data: thumbData,
      filename: path.basename(result.thumbnailPath),
      mimeType: "image/jpeg",
      folder: "thumbnails",
      relativePath: `${job.id}.jpg`
    });

    const hlsAsset = await prisma.asset.create({
      data: {
        kind: AssetKind.HLS_MASTER,
        storage: mapStorageProvider(masterStorage || "local"),
        pathOrUrl: masterStoredPath,
        metaJson: {
          variants: [
            { label: "360p", path: `${storageFolder}/360p/index.m3u8` },
            { label: "480p", path: `${storageFolder}/480p/index.m3u8` },
            { label: "720p", path: `${storageFolder}/720p/index.m3u8` }
          ]
        }
      }
    });

    const thumbAsset = await prisma.asset.create({
      data: {
        kind: AssetKind.THUMBNAIL,
        storage: mapStorageProvider(thumbStored.storage),
        pathOrUrl: thumbStored.path
      }
    });

    await prisma.mediaJob.update({
      where: { id: jobId },
      data: {
        status: MediaJobStatus.READY,
        outputHlsAssetId: hlsAsset.id,
        outputThumbAssetId: thumbAsset.id
      }
    });

    if (job.titleId) {
      await prisma.title.update({
        where: { id: job.titleId },
        data: { videoAssetId: hlsAsset.id }
      });
    }

    if (job.episodeId) {
      await prisma.episode.update({
        where: { id: job.episodeId },
        data: { videoAssetId: hlsAsset.id }
      });
    }

    console.log(`[media-job] ready ${jobId}`);
    return job;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[media-job] failed ${jobId}:`, message);
    await prisma.mediaJob.update({
      where: { id: jobId },
      data: { status: MediaJobStatus.FAILED, errorMessage: message }
    });
    throw error;
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}
