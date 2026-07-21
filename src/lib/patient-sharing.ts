export const PATIENT_SHARE_SCOPES = [
  "SUMMARY",
  "CLINICAL_HISTORY",
  "DOCUMENTS",
] as const;

export type PatientShareScope = (typeof PATIENT_SHARE_SCOPES)[number];

export const PATIENT_SHARE_SCOPE_LABELS: Record<PatientShareScope, string> = {
  SUMMARY: "Health summary",
  CLINICAL_HISTORY: "Clinical history",
  DOCUMENTS: "Document list",
};

export const PATIENT_SHARE_CONSENT_STATEMENT =
  "The patient or authorised guardian explicitly consents to the selected health information being viewed by the named destination practice until the stated expiry date. Access is read-only, may be revoked at any time, and every view is audited.";

export function parsePatientShareScopes(value: string): PatientShareScope[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PatientShareScope =>
          PATIENT_SHARE_SCOPES.includes(item),
        )
      : [];
  } catch {
    return [];
  }
}
