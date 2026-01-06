import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export type HlsResult = {
  hlsPath: string;
  thumbnailPath: string;
  renditionManifestPaths: string[];
};

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, { stdio: "inherit" });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

export async function createHlsAndThumbnail(inputPath: string, outputDir: string): Promise<HlsResult> {
  await fs.mkdir(outputDir, { recursive: true });
  const hlsDir = path.join(outputDir, "hls");
  const thumbDir = path.join(outputDir, "thumbs");
  await fs.mkdir(hlsDir, { recursive: true });
  await fs.mkdir(thumbDir, { recursive: true });

  const rendition360 = path.join(hlsDir, "360p");
  const rendition720 = path.join(hlsDir, "720p");
  await fs.mkdir(rendition360, { recursive: true });
  await fs.mkdir(rendition720, { recursive: true });

  const args = [
    "-i",
    inputPath,
    "-filter_complex",
    "[0:v]split=2[v1][v2]; [v1]scale=w=640:h=360:force_original_aspect_ratio=decrease[v1out]; [v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out]",
    "-map",
    "[v1out]",
    "-map",
    "0:a?",
    "-c:v",
    "h264",
    "-profile:v",
    "main",
    "-crf",
    "20",
    "-sc_threshold",
    "0",
    "-g",
    "48",
    "-keyint_min",
    "48",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-b:v",
    "800k",
    "-maxrate",
    "856k",
    "-bufsize",
    "1200k",
    "-b:a",
    "96k",
    "-hls_segment_filename",
    path.join(rendition360, "seg_%03d.ts"),
    path.join(rendition360, "index.m3u8"),
    "-map",
    "[v2out]",
    "-map",
    "0:a?",
    "-c:v",
    "h264",
    "-profile:v",
    "main",
    "-crf",
    "20",
    "-sc_threshold",
    "0",
    "-g",
    "48",
    "-keyint_min",
    "48",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-b:v",
    "2800k",
    "-maxrate",
    "2996k",
    "-bufsize",
    "4200k",
    "-b:a",
    "128k",
    "-hls_segment_filename",
    path.join(rendition720, "seg_%03d.ts"),
    path.join(rendition720, "index.m3u8")
  ];

  await runFfmpeg(args);

  const masterPlaylist = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=640x360\n360p/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720\n720p/index.m3u8\n`;
  await fs.writeFile(path.join(hlsDir, "master.m3u8"), masterPlaylist);

  const thumbPath = path.join(thumbDir, "thumb.jpg");
  await runFfmpeg(["-i", inputPath, "-ss", "00:00:05", "-vframes", "1", thumbPath]);

  return {
    hlsPath: path.join(hlsDir, "master.m3u8"),
    thumbnailPath: thumbPath,
    renditionManifestPaths: [
      path.join(rendition360, "index.m3u8"),
      path.join(rendition720, "index.m3u8")
    ]
  };
}
