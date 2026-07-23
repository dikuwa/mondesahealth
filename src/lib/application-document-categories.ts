export const APPLICATION_DOCUMENT_CATEGORIES = [
  { value: "PRACTICE_REGISTRATION", label: "Practice registration certificate" },
  { value: "PROFESSIONAL_REGISTRATION", label: "Professional registration certificate" },
  { value: "NAMAF_REGISTRATION", label: "NAMAF or medical-aid provider registration" },
  { value: "BUSINESS_REGISTRATION", label: "Business registration document" },
  { value: "PRACTITIONER_IDENTITY", label: "Practitioner identity document" },
  { value: "QUALIFICATION_CERTIFICATE", label: "Qualification certificate" },
  { value: "PRACTICE_LETTERHEAD", label: "Official practice letterhead" },
  { value: "MEDICAL_CERTIFICATE_SAMPLE", label: "Existing medical certificate or sick-note sample" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of practice address" },
  { value: "TAX_REGISTRATION", label: "Tax or VAT registration" },
  { value: "OTHER", label: "Other supporting document" },
] as const;

export const APPLICATION_DOCUMENT_CATEGORY_VALUES = APPLICATION_DOCUMENT_CATEGORIES.map(
  ({ value }) => value,
) as [(typeof APPLICATION_DOCUMENT_CATEGORIES)[number]["value"], ...(typeof APPLICATION_DOCUMENT_CATEGORIES)[number]["value"][]];

export function documentCategoryLabel(value: string): string {
  return (
    APPLICATION_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ??
    value.replaceAll("_", " ").toLowerCase().replace(/^./, (l) => l.toUpperCase())
  );
}

export const DOCUMENT_REVIEW_STATUSES = [
  "UPLOADED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REPLACEMENT_REQUESTED",
  "REJECTED",
  "EXPIRED",
] as const;

export const APPLICATION_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "MORE_INFORMATION_REQUIRED", label: "More information required" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;

export const VALID_APPLICATION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED"],
  MORE_INFORMATION_REQUIRED: ["UNDER_REVIEW", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function isValidApplicationTransition(
  from: string,
  to: string,
): boolean {
  return VALID_APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}
