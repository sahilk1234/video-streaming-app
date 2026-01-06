import path from "path";
import { createHlsAndThumbnail } from "../lib/video/ffmpeg";

async function main() {
  const [input, outputDir] = process.argv.slice(2);
  if (!input || !outputDir) {
    console.error("Usage: tsx scripts/ffmpeg-transcode.ts <input.mp4> <outputDir>");
    process.exit(1);
  }

  const resolvedInput = path.resolve(input);
  const resolvedOutput = path.resolve(outputDir);
  await createHlsAndThumbnail(resolvedInput, resolvedOutput);
  console.log("Transcode complete:", resolvedOutput);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
