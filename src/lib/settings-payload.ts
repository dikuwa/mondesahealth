export const SETTINGS_SECTION_FIELDS = {
  practice: [
    "practiceName", "doctorName", "practiceNumber", "registrationNumber",
    "phone", "whatsapp", "email", "address",
  ],
  documents: ["currency", "signatureName", "signatureTitle", "vatEnabled"],
  "public-site": [
    "tagline", "publicDescription", "locationNote", "mapsUrl",
    "mapLatitude", "mapLongitude", "publicHours", "showEmail", "showWhatsapp",
  ],
  claims: [
    "claimContactName", "claimPhone", "claimEmail", "claimPostalAddress", "consentWording",
  ],
} as const;

export type EditableSettingsSection = keyof typeof SETTINGS_SECTION_FIELDS;
export type SettingsRequestKind = "MEDICAL_AID" | "BOOKING" | "REMINDER" | "DETAILS" | "AI" | "INVALID";

export function settingsPayloadForSection<T extends object>(section: EditableSettingsSection, values: T): Partial<T> {
  const source = values as Record<string, unknown>;
  return Object.fromEntries(SETTINGS_SECTION_FIELDS[section].map((field) => [field, source[field]])) as Partial<T>;
}

export function isEditableSettingsSection(value: string): value is EditableSettingsSection {
  return Object.hasOwn(SETTINGS_SECTION_FIELDS, value);
}

export function classifySettingsRequest(body: unknown): SettingsRequestKind {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "INVALID";
  const value = body as Record<string, unknown>;
  if ("medicalAidId" in value) return "MEDICAL_AID";
  if ("bookingMode" in value) return "BOOKING";
  if ("reminderEnabled" in value || "reminderLeadHours" in value) return "REMINDER";
  // Details deliberately take precedence over AI. Older clients sent the
  // complete settings object, which also contained AI flags; treating that as
  // an AI-only request caused a false success while discarding practice edits.
  if (Object.values(SETTINGS_SECTION_FIELDS).flat().some((field) => field in value)) return "DETAILS";
  if ("aiIntakeEnabled" in value || "aiImageEnabled" in value) return "AI";
  return "INVALID";
}
