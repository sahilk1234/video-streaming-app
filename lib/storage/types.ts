export type StorageProvider = "local" | "s3";

export type SaveFileParams = {
  data: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
  relativePath?: string;
};

export type StoredFile = {
  path: string;
  storage: StorageProvider;
  mimeType: string;
  size: number;
};

export interface StorageAdapter {
  saveFile(params: SaveFileParams): Promise<StoredFile>;
  getPublicUrl(path: string): string;
  getLocalPath(path: string): string | null;
}
