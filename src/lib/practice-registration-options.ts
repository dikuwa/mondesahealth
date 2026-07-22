export const PRACTICE_TYPE_OPTIONS = [
  { value: "GENERAL_PRACTICE", label: "General practice" },
  { value: "MEDICAL_CENTRE", label: "Medical centre" },
  { value: "SPECIALIST_PRACTICE", label: "Specialist practice" },
  { value: "DENTAL_PRACTICE", label: "Dental practice" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "MENTAL_HEALTH", label: "Mental health practice" },
  { value: "OPTOMETRY", label: "Optometry" },
  { value: "OCCUPATIONAL_HEALTH", label: "Occupational health" },
  { value: "OTHER", label: "Other healthcare practice" },
] as const;

export const PRACTICE_TYPE_VALUES = PRACTICE_TYPE_OPTIONS.map(({ value }) => value) as [
  (typeof PRACTICE_TYPE_OPTIONS)[number]["value"],
  ...(typeof PRACTICE_TYPE_OPTIONS)[number]["value"][],
];

export function practiceTypeLabel(value: string) {
  return PRACTICE_TYPE_OPTIONS.find((option) => option.value === value)?.label
    || value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
