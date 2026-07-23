/**
 * Normalises a Namibian phone number to international (+264) format.
 *
 * Accepts local formats (081..., 083..., 085..., 061...) and
 * international formats (+264...). Returns the normalised number
 * or null if the input cannot be parsed.
 */
export function normaliseNamibianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw.trim().replace(/[\s\-\(\)]+/g, "");

  // Already in +264 format: +264 81 xxx xxxx
  const intMatch = cleaned.match(/^\+264(\d{7,9})$/);
  if (intMatch) return `+264${intMatch[1]}`;

  // Local mobile prefixes: 081, 083, 085
  const mobileMatch = cleaned.match(/^(0(?:81|82|83|85|86)\d{7})$/);
  if (mobileMatch) return `+264${mobileMatch[1].slice(1)}`;

  // Local landline prefixes: 061 (Windhoek), 064, 065, 066, 067
  const landlineMatch = cleaned.match(/^(0(?:61|62|63|64|65|66|67)\d{6})$/);
  if (landlineMatch) return `+264${landlineMatch[1].slice(1)}`;

  // Number without leading 0 but looks like a Namibian mobile (8 digits after 81/83/85)
  const bareMobileMatch = cleaned.match(/^(81|82|83|85|86)(\d{7})$/);
  if (bareMobileMatch) return `+264${bareMobileMatch[1]}${bareMobileMatch[2]}`;

  // Could not parse — return null so callers can fall back to the original
  return null;
}
