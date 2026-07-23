import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME,
  generateStorageKey,
  isDuplicateUpload,
  MAX_BYTES,
  prepareStoredFile,
  processUploadedFile,
  validateUploadedFile,
} from "./storage";

function fakeFile(
  name: string,
  type: string,
  size: number,
  content?: string,
): File {
  const payload = content ?? "x".repeat(Math.max(size, 1));
  const blob = new Blob([payload], { type });
  return new File([blob], name, { type }) as File;
}

describe("validateUploadedFile", () => {
  it("accepts a valid PDF", () => {
    const file = fakeFile("document.pdf", "application/pdf", 100_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid JPG", () => {
    const file = fakeFile("photo.jpg", "image/jpeg", 50_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid PNG", () => {
    const file = fakeFile("image.png", "image/png", 75_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(true);
  });

  it("rejects an unsupported extension", () => {
    const file = fakeFile("file.gif", "image/gif", 10_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/gif/i);
  });

  it("rejects an unsupported MIME type", () => {
    const file = fakeFile("file.pdf", "text/plain", 10_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("text/plain");
  });

  it("rejects an empty file", () => {
    const file = fakeFile("empty.pdf", "application/pdf", 0, "");
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("empty");
  });

  it("rejects an oversized file", () => {
    const file = fakeFile("large.pdf", "application/pdf", MAX_BYTES + 1);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("too large");
  });

  it("accepts custom max bytes option", () => {
    const file = fakeFile("small.pdf", "application/pdf", 5_000);
    const result = validateUploadedFile(file, { maxBytes: 10_000 });
    expect(result.ok).toBe(true);
  });

  it("rejects file exceeding custom max bytes", () => {
    const file = fakeFile("medium.pdf", "application/pdf", 15_000);
    const result = validateUploadedFile(file, { maxBytes: 10_000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("0 MB");
  });

  it("handles uppercase extensions", () => {
    const file = fakeFile("Doc.PDF", "application/pdf", 50_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(true);
  });

  it("handles files with multiple dots in name", () => {
    const file = fakeFile("my.document.final.pdf", "application/pdf", 50_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(true);
  });

  it("rejects a file with no extension", () => {
    const file = fakeFile("README", "application/pdf", 50_000);
    const result = validateUploadedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/readme/i);
  });
});

describe("processUploadedFile", () => {
  it("processes a valid file and computes checksum", async () => {
    const file = fakeFile("doc.pdf", "application/pdf", 100, "hello world");
    const result = await processUploadedFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checksum).toBeTruthy();
      expect(result.checksum.length).toBe(64); // SHA-256 hex
      expect(result.mimeType).toBe("application/pdf");
      expect(result.extension).toBe(".pdf");
    }
  });

  it("rejects an empty file after reading bytes", async () => {
    const file = fakeFile("empty.pdf", "application/pdf", 0, "");
    const result = await processUploadedFile(file);
    expect(result.ok).toBe(false);
  });

  it("rejects an oversized file after reading bytes", async () => {
    const largeContent = "x".repeat(MAX_BYTES + 1);
    const file = fakeFile("large.pdf", "application/pdf", largeContent.length, largeContent);
    const result = await processUploadedFile(file);
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported extension", async () => {
    const file = fakeFile("file.gif", "image/gif", 100);
    const result = await processUploadedFile(file);
    expect(result.ok).toBe(false);
  });

  it("produces a deterministic checksum for identical content", async () => {
    const file1 = fakeFile("a.pdf", "application/pdf", 5, "same content");
    const file2 = fakeFile("b.pdf", "application/pdf", 5, "same content");
    const r1 = await processUploadedFile(file1);
    const r2 = await processUploadedFile(file2);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.checksum).toBe(r2.checksum);
    }
  });

  it("produces different checksums for different content", async () => {
    const file1 = fakeFile("a.pdf", "application/pdf", 5, "content A");
    const file2 = fakeFile("b.pdf", "application/pdf", 5, "content B");
    const r1 = await processUploadedFile(file1);
    const r2 = await processUploadedFile(file2);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.checksum).not.toBe(r2.checksum);
    }
  });
});

describe("generateStorageKey", () => {
  it("generates a key with the expected prefix", () => {
    const key = generateStorageKey("app123", "PRACTICE_REGISTRATION", "doc.pdf");
    expect(key).toMatch(/^applications\/app123\/practice_registration\//);
    expect(key).toContain("doc.pdf");
  });

  it("sanitises the category name", () => {
    const key = generateStorageKey("app1", "Medical Certificate!", "file.pdf");
    expect(key).toMatch(/^applications\/app1\/medical_certificate_/);
  });
});

describe("isDuplicateUpload", () => {
  it("detects a duplicate checksum", () => {
    expect(
      isDuplicateUpload("abc123", ["def456", "abc123", "ghi789"]),
    ).toBe(true);
  });

  it("returns false when no duplicates exist", () => {
    expect(
      isDuplicateUpload("xyz789", ["abc123", "def456"]),
    ).toBe(false);
  });

  it("returns false for empty existing list", () => {
    expect(isDuplicateUpload("abc123", [])).toBe(false);
  });
});

describe("prepareStoredFile", () => {
  it("returns a StoredFile object with the expected shape", () => {
    const buf = Buffer.from("test data");
    const stored = prepareStoredFile(
      "key.pdf",
      "original.pdf",
      "application/pdf",
      100,
      "checksum123",
      buf,
    );
    expect(stored.storageKey).toBe("key.pdf");
    expect(stored.originalFilename).toBe("original.pdf");
    expect(stored.mimeType).toBe("application/pdf");
    expect(stored.size).toBe(100);
    expect(stored.checksum).toBe("checksum123");
    expect(stored.data).toBe(buf);
  });
});

describe("constants", () => {
  it("ALLOWED_MIME contains expected types", () => {
    expect(ALLOWED_MIME.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME.has("image/png")).toBe(true);
    expect(ALLOWED_MIME.has("text/plain")).toBe(false);
  });

  it("ALLOWED_EXTENSIONS contains expected extensions", () => {
    expect(ALLOWED_EXTENSIONS.has(".pdf")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has(".jpg")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has(".jpeg")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has(".png")).toBe(true);
    expect(ALLOWED_EXTENSIONS.has(".gif")).toBe(false);
  });

  it("MAX_BYTES is 10 MB", () => {
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
