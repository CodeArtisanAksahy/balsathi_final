import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, s3Enabled } from "./config";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
  }
  return s3Client;
}

export interface UploadResult {
  storageKey: string;
  url: string;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  if (s3Enabled()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  } else {
    const filePath = path.join(config.storage.localDir, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  return { storageKey: key, url: await getSignedUrl(key) };
}

export async function getSignedUrl(key: string): Promise<string> {
  // Serve both local and S3-backed files through the authorized download route.
  return `/api/upload/${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  if (s3Enabled()) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      }),
    );
  } else {
    const filePath = path.join(config.storage.localDir, key);
    try {
      await unlink(filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw error;
    }
  }
}

/**
 * Read a locally stored file. Returns the contents and a guessed MIME type.
 * Throws if the key is not allowed or the file does not exist.
 */
export async function readStoredFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const normalizedKey = key.replace(/\\/g, "/");
  if (!/^uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(normalizedKey)) {
    throw new Error("FORBIDDEN_KEY");
  }
  if (s3Enabled()) {
    const object = await getS3Client().send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: normalizedKey,
    }));
    if (!object.Body) throw new Error("NOT_FOUND");
    const buffer = Buffer.from(await object.Body.transformToByteArray());
    return { buffer, mimeType: object.ContentType ?? guessMimeType(normalizedKey) };
  }
  const storageRoot = path.resolve(config.storage.localDir);
  const filePath = path.resolve(storageRoot, normalizedKey);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) throw new Error("FORBIDDEN_KEY");
  const buffer = await readFile(filePath);
  return { buffer, mimeType: guessMimeType(filePath) };
}

/** @deprecated Use readStoredFile so both configured storage backends are supported. */
export const readLocalFile = readStoredFile;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

// Re-exported for callers that want to verify S3 mode without importing config.
export { s3Enabled };
