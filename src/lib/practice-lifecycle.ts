/**
 * Practice lifecycle status constants.
 *
 * These are separate from application statuses and track the
 * overall lifecycle of a practice after its application is approved.
 */
export const PRACTICE_LIFECYCLE_STATUSES = [
  { value: "PENDING_SETUP", label: "Pending setup" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "PENDING_VERIFICATION", label: "Pending verification" },
  { value: "ACTIVE_PRIVATE", label: "Active (private)" },
  { value: "ACTIVE_PUBLIC", label: "Active (public)" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
] as const;

export const PRACTICE_LIFECYCLE_VALUES = PRACTICE_LIFECYCLE_STATUSES.map(
  ({ value }) => value,
);

export type PracticeLifecycleStatus =
  (typeof PRACTICE_LIFECYCLE_VALUES)[number];

export const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  PENDING_SETUP: ["ONBOARDING", "DEACTIVATED"],
  ONBOARDING: ["PENDING_VERIFICATION", "PENDING_SETUP", "DEACTIVATED"],
  PENDING_VERIFICATION: ["ACTIVE_PRIVATE", "ONBOARDING", "DEACTIVATED"],
  ACTIVE_PRIVATE: ["ACTIVE_PUBLIC", "SUSPENDED", "DEACTIVATED"],
  ACTIVE_PUBLIC: ["ACTIVE_PRIVATE", "SUSPENDED", "DEACTIVATED"],
  SUSPENDED: ["ACTIVE_PRIVATE", "DEACTIVATED"],
  DEACTIVATED: [],
};

export function isValidLifecycleTransition(
  from: string,
  to: string,
): boolean {
  return VALID_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}
