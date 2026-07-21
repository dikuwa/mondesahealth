import { describe, expect, it } from "vitest";
import { canFinalizePlatformSeparation, resolveAccountScope } from "@/lib/account-scope";

describe("account scope separation", () => {
  it("distinguishes strict platform, practice and temporary compatibility sessions", () => {
    expect(resolveAccountScope("PLATFORM_OWNER", null)).toBe("PLATFORM");
    expect(resolveAccountScope(null, "practice-1")).toBe("PRACTICE");
    expect(resolveAccountScope("PLATFORM_OWNER", "mondesa-health")).toBe("TRANSITIONAL");
    expect(resolveAccountScope(null, null)).toBe("INVALID");
  });

  it("allows finalization only after an independent owner is active in the same practice", () => {
    expect(canFinalizePlatformSeparation({ scope: "TRANSITIONAL", sessionPracticeId: "p1", targetPracticeId: "p1", hasIndependentOwner: true })).toBe(true);
    expect(canFinalizePlatformSeparation({ scope: "TRANSITIONAL", sessionPracticeId: "p1", targetPracticeId: "p1", hasIndependentOwner: false })).toBe(false);
    expect(canFinalizePlatformSeparation({ scope: "PLATFORM", sessionPracticeId: null, targetPracticeId: "p1", hasIndependentOwner: true })).toBe(false);
  });
});
