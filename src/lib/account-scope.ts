export type AccountScope = "PLATFORM" | "PRACTICE" | "TRANSITIONAL" | "INVALID";

export function resolveAccountScope(platformRole: string | null, practiceId: string | null): AccountScope {
  if (platformRole === "PLATFORM_OWNER") return practiceId ? "TRANSITIONAL" : "PLATFORM";
  return practiceId ? "PRACTICE" : "INVALID";
}

export function canFinalizePlatformSeparation(input: {
  scope: AccountScope;
  sessionPracticeId: string | null;
  targetPracticeId: string;
  hasIndependentOwner: boolean;
}) {
  return input.scope === "TRANSITIONAL" && input.sessionPracticeId === input.targetPracticeId && input.hasIndependentOwner;
}
