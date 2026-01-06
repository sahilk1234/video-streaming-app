import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import mime from "mime-types";
import { Readable } from "stream";
import { getStorageProvider } from "@/lib/storage";
import { s3StorageAdapter } from "@/lib/storage/s3";

export const runtime = "nodejs";

function getBaseDir() {
  return path.resolve(process.env.LOCAL_MEDIA_DIR || "./storage");
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const provider = getStorageProvider();
  const assetPath = params.path.join("/");

  if (provider === "s3") {
    return Response.redirect(s3StorageAdapter.getPublicUrl(assetPath));
  }

  const baseDir = getBaseDir();
  const filePath = path.resolve(baseDir, assetPath);
  if (!filePath.startsWith(baseDir)) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const stat = await fsPromises.stat(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";
    const range = request.headers.get("range");

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(startStr, 10);
      const end = endStr ? Number.parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      const nodeStream = fs.createReadStream(filePath, { start, end });
      const stream = Readable.toWeb(nodeStream);

      return new Response(stream as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType.toString()
        }
      });
    }

    const nodeStream = fs.createReadStream(filePath);
    const stream = Readable.toWeb(nodeStream);

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": mimeType.toString(),
        "Content-Length": stat.size.toString()
      }
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}
