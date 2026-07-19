const allowed = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
} as const;

export const INTAKE_IMAGE_LIMIT = 3;
export const INTAKE_IMAGE_BYTES = 4 * 1024 * 1024;

export function validateIntakeImage(input: { mimeType: string; filename: string; data: Uint8Array }) {
  if (!(input.mimeType in allowed)) return "Use a JPG, PNG or WebP image.";
  if (input.data.byteLength === 0 || input.data.byteLength > INTAKE_IMAGE_BYTES)
    return "Each image must be smaller than 4 MB.";
  const signatures = allowed[input.mimeType as keyof typeof allowed];
  if (!signatures.some((signature) => signature.every((byte, index) => input.data[index] === byte)))
    return "The image content does not match its file type.";
  if (!/\.(jpe?g|png|webp)$/i.test(input.filename)) return "Use a recognised image filename.";
  if (input.mimeType === "image/webp" && String.fromCharCode(...input.data.slice(8, 12)) !== "WEBP")
    return "The WebP image is not valid.";
  return null;
}
