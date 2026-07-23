export const APPLICATION_REJECTION_CATEGORIES = [
  { value: "UNABLE_TO_VERIFY_REGISTRATION", label: "Unable to verify registration" },
  { value: "INCOMPLETE_INFORMATION", label: "Incomplete information" },
  { value: "DUPLICATE_APPLICATION", label: "Duplicate application" },
  { value: "INELIGIBLE_PRACTICE_TYPE", label: "Ineligible practice type" },
  { value: "FRAUD_CONCERN", label: "Fraud or misrepresentation concern" },
  { value: "APPLICANT_WITHDREW", label: "Applicant withdrew" },
  { value: "OTHER", label: "Other" },
] as const;

export const APPLICATION_REJECTION_VALUES = APPLICATION_REJECTION_CATEGORIES.map(
  ({ value }) => value,
);

export function rejectionCategoryLabel(value: string): string {
  return (
    APPLICATION_REJECTION_CATEGORIES.find((c) => c.value === value)?.label ??
    value.replaceAll("_", " ").toLowerCase().replace(/^./, (l) => l.toUpperCase())
  );
}

export const REJECTION_CATEGORY_OPTIONS: (
  | { value: ""; label: string; disabled: true }
  | { value: string; label: string; disabled?: false }
)[] = [
  { value: "", label: "Select rejection reason", disabled: true },
  ...APPLICATION_REJECTION_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
  })),
];
