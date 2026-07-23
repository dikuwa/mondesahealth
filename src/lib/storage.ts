import { createHash } from "crypto";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]) as ReadonlySet<string>;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
]) as ReadonlySet<string>;

const MAX_BYTES = 10 * 1024 * 1024;

export type FileValidation = {
  ok: true;
  data: Buffer;
  mimeType: string;
  extension: string;
  checksum: string;
} | {
  ok: false;
  error: string;
};

export type StoredFile = {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  checksum: string;
  data: Buffer;
};

/**
 * Validates a file from a FormData upload.
 * Checks: MIME type, extension, size, and computes SHA-256 checksum.
 */
export function validateUploadedFile(
  file: File,
  options?: { maxBytes?: number },
): FileValidation {
  const max = options?.maxBytes ?? MAX_BYTES;

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: `Unsupported file type "${extension}". Use PDF, JPG, or PNG.`,
    };
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type "${file.type}". Use PDF, JPG, or PNG.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: "The file appears to be empty." };
  }

  if (file.size > max) {
    return {
      ok: false,
      error: `The file is too large. Maximum size is ${(max / 1024 / 1024).toFixed(0)} MB.`,
    };
  }

  return { ok: true, data: Buffer.alloc(0), mimeType: file.type, extension, checksum: "" };
}

/**
 * Reads a file's bytes, validates content, and computes its SHA-256 checksum.
 * Call this after validateUploadedFile passes to process the actual data.
 */
export async function processUploadedFile(
  file: File,
  options?: { maxBytes?: number },
): Promise<FileValidation> {
  const max = options?.maxBytes ?? MAX_BYTES;

  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  if (data.byteLength <= 0) {
    return { ok: false, error: "The file appears to be empty." };
  }

  if (data.byteLength > max) {
    return {
      ok: false,
      error: `The file is too large. Maximum size is ${(max / 1024 / 1024).toFixed(0)} MB.`,
    };
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: `Unsupported file type "${extension}". Use PDF, JPG, or PNG.`,
    };
  }

  const mimeType = file.type || "application/octet-stream";
  const checksum = createHash("sha256").update(data).digest("hex");

  return { ok: true, data, mimeType, extension, checksum };
}

/**
 * Generates a unique storage key for a file.
 */
export function generateStorageKey(
  applicationId: string,
  category: string,
  filename: string,
): string {
  const safeCategory = category.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const timestamp = Date.now().toString(36);
  const random = createHash("md5")
    .update(`${applicationId}-${category}-${filename}-${timestamp}-${Math.random()}`)
    .digest("hex")
    .slice(0, 12);
  return `applications/${applicationId}/${safeCategory}/${timestamp}-${random}-${filename}`;
}

/**
 * Detects duplicate files by comparing checksums within a set of existing checksums.
 */
export function isDuplicateUpload(
  checksum: string,
  existingChecksums: string[],
): boolean {
  return existingChecksums.includes(checksum);
}

/**
 * Stores a file (in production this would use S3/R2; for now follows
 * the existing pattern of storing file bytes in the database).
 */
export function prepareStoredFile(
  storageKey: string,
  originalFilename: string,
  mimeType: string,
  size: number,
  checksum: string,
  data: Buffer,
): StoredFile {
  return { storageKey, originalFilename, mimeType, size, checksum, data };
}

export { ALLOWED_MIME, ALLOWED_EXTENSIONS, MAX_BYTES };
