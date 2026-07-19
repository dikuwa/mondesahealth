import { describe, expect, it } from "vitest";
import { INTAKE_IMAGE_BYTES, validateIntakeImage } from "./intake-files";

describe("private intake image validation", () => {
  it("checks declared type, extension, size and magic bytes", () => {
    expect(validateIntakeImage({ filename: "synthetic.jpg", mimeType: "image/jpeg", data: new Uint8Array([0xff, 0xd8, 0xff, 0x00]) })).toBeNull();
    expect(validateIntakeImage({ filename: "synthetic.jpg", mimeType: "image/jpeg", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) })).toContain("does not match");
    expect(validateIntakeImage({ filename: "synthetic.txt", mimeType: "image/jpeg", data: new Uint8Array([0xff, 0xd8, 0xff]) })).toContain("filename");
  });
  it("rejects oversized files", () => {
    expect(validateIntakeImage({ filename: "synthetic.png", mimeType: "image/png", data: new Uint8Array(INTAKE_IMAGE_BYTES + 1) })).toContain("smaller than 4 MB");
  });
});
