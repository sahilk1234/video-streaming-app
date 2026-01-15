import fs from "fs/promises";
import path from "path";
import { SaveFileParams, StorageAdapter, StoredFile } from "./types";

const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";

function sanitizeFilename(filename: string) {
  return path.basename(filename).replace(/\s+/g, "-");
}

function toUrlPath(filePath: string) {
  return filePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const localStorageAdapter: StorageAdapter = {
  async saveFile({ data, filename, mimeType, folder, relativePath }: SaveFileParams): Promise<StoredFile> {
    const safeName = sanitizeFilename(filename);
    const targetDir = path.join(baseDir, folder);
    await fs.mkdir(targetDir, { recursive: true });
    const fileName = relativePath ? relativePath : `${crypto.randomUUID()}-${safeName}`;
    const filePath = path.join(targetDir, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    const storedPath = path.relative(baseDir, filePath).split(path.sep).join("/");
    return {
      path: storedPath,
      storage: "local",
      mimeType,
      size: data.length
    };
  },
  getPublicUrl(filePath: string) {
    return `/api/media/${toUrlPath(filePath)}`;
  },
  getLocalPath(filePath: string) {
    return path.join(baseDir, filePath);
  }
};
