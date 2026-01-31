import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { pipeline } from "stream/promises";

type UploadInput = {
  key: string;
  data: Buffer;
  contentType?: string;
};

let cachedClient: S3Client | null = null;

function getS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

  cachedClient = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials
  });

  return cachedClient;
}

function getBucket() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  return bucket;
}

function normalizeKey(key: string) {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

function joinUrlPath(basePath: string, suffix: string) {
  const trimmedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const trimmedSuffix = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  if (!trimmedBase) {
    return `/${trimmedSuffix}`;
  }
  return `${trimmedBase}/${trimmedSuffix}`;
}

function getPublicUrl(key: string) {
  const bucket = getBucket();
  const normalizedKey = normalizeKey(key);
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;

  if (endpoint) {
    const url = new URL(endpoint);
    const basePath = url.pathname || "";
    const hasBucketInHost = url.hostname.startsWith(`${bucket}.`);
    const pathSuffix = hasBucketInHost
      ? joinUrlPath(basePath, normalizedKey)
      : joinUrlPath(basePath, `${bucket}/${normalizedKey}`);
    return `${url.origin}${pathSuffix}`;
  }

  const region = process.env.S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}

export async function uploadToS3({ key, data, contentType }: UploadInput) {
  const client = getS3Client();
  const bucket = getBucket();
  const normalizedKey = normalizeKey(key);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      Body: data,
      ContentType: contentType
    })
  );

  return normalizedKey;
}

export async function downloadFromS3(key: string, outputPath: string) {
  const client = getS3Client();
  const bucket = getBucket();
  const normalizedKey = normalizeKey(key);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: normalizedKey
    })
  );

  if (!response.Body) {
    throw new Error(`Missing body for s3://${bucket}/${normalizedKey}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const body = response.Body;
  const stream = body instanceof Readable
    ? body
    : Readable.fromWeb(body as unknown as WebReadableStream<Uint8Array>);
  await pipeline(stream, createWriteStream(outputPath));
}

export const s3StorageAdapter = {
  getPublicUrl
};
