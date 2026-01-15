import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { s3StorageAdapter, uploadToS3 } from "./s3";

export type StorageProvider = "local" | "s3";

export type SaveFileInput = {
  data: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
  relativePath?: string;
};

export type StoredFile = {
  storage: StorageProvider;
  path: string;
};

function normalizeStorage(value?: string | null): StorageProvider {
  return value && value.toLowerCase() === "s3" ? "s3" : "local";
}

function getLocalBaseDir() {
  return path.resolve(process.env.LOCAL_MEDIA_DIR || "./storage");
}

function toPosixPath(value: string) {
  return value.replace(/\\/g, "/");
}

function sanitizeFilename(filename: string) {
  const base = path.posix.basename(toPosixPath(filename));
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "-");
  return safe || "file";
}

function buildStoragePath(folder: string, filename: string, relativePath?: string) {
  const cleanFolder = toPosixPath(folder).replace(/^\/+/, "");
  const cleanRelative = relativePath
    ? toPosixPath(relativePath).replace(/^\/+/, "")
    : `${randomUUID()}-${sanitizeFilename(filename)}`;
  const joined = path.posix.normalize(path.posix.join(cleanFolder, cleanRelative));
  if (joined.startsWith("..")) {
    throw new Error("Invalid storage path");
  }
  return joined;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//.test(value) || value.startsWith("//") || value.startsWith("data:") || value.startsWith("blob:");
}

export function getStorageProvider(): StorageProvider {
  return normalizeStorage(process.env.MEDIA_STORAGE);
}

export function getAssetUrl(asset: { pathOrUrl: string; storage?: string | null }) {
  if (!asset?.pathOrUrl) {
    return null;
  }
  if (looksLikeUrl(asset.pathOrUrl)) {
    return asset.pathOrUrl;
  }
  const storage = normalizeStorage(asset.storage ?? process.env.MEDIA_STORAGE);
  const normalizedPath = asset.pathOrUrl.replace(/^\/+/, "");
  if (storage === "s3") {
    return s3StorageAdapter.getPublicUrl(normalizedPath);
  }
  return `/api/media/${normalizedPath}`;
}

export function getAssetLocalPath(asset: { pathOrUrl: string; storage?: string | null }) {
  const storage = normalizeStorage(asset.storage);
  if (storage !== "local") {
    return null;
  }
  const baseDir = getLocalBaseDir();
  const relativePath = asset.pathOrUrl.replace(/^\/+/, "");
  const resolvedPath = path.resolve(baseDir, relativePath);
  const relative = path.relative(baseDir, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolvedPath;
}

export async function saveFile({
  data,
  filename,
  mimeType,
  folder,
  relativePath
}: SaveFileInput): Promise<StoredFile> {
  const storage = getStorageProvider();
  const storedPath = buildStoragePath(folder, filename, relativePath);

  if (storage === "s3") {
    await uploadToS3({ key: storedPath, data, contentType: mimeType });
    return { storage, path: storedPath };
  }

  const baseDir = getLocalBaseDir();
  const absolutePath = path.resolve(baseDir, storedPath);
  const relative = path.relative(baseDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage path");
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, data);

  return { storage: "local", path: storedPath };
}
