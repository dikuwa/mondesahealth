import { describe, expect, it } from "vitest";
import { isValidLifecycleTransition, PRACTICE_LIFECYCLE_VALUES } from "./practice-lifecycle";

describe("PracticeRecordView lifecycle integration", () => {
  it("includes all required lifecycle values", () => {
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("PENDING_SETUP");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("ONBOARDING");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("PENDING_VERIFICATION");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("ACTIVE_PRIVATE");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("ACTIVE_PUBLIC");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("SUSPENDED");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("DEACTIVATED");
  });

  it("allows PENDING_VERIFICATION → ACTIVE_PRIVATE (activation)", () => {
    expect(
      isValidLifecycleTransition("PENDING_VERIFICATION", "ACTIVE_PRIVATE"),
    ).toBe(true);
  });

  it("allows ACTIVE_PRIVATE → ACTIVE_PUBLIC (publish)", () => {
    expect(
      isValidLifecycleTransition("ACTIVE_PRIVATE", "ACTIVE_PUBLIC"),
    ).toBe(true);
  });

  it("blocks PENDING_SETUP → ACTIVE_PUBLIC (skip activation)", () => {
    expect(
      isValidLifecycleTransition("PENDING_SETUP", "ACTIVE_PUBLIC"),
    ).toBe(false);
  });

  it("allows ACTIVE_PUBLIC → ACTIVE_PRIVATE (unpublish)", () => {
    expect(
      isValidLifecycleTransition("ACTIVE_PUBLIC", "ACTIVE_PRIVATE"),
    ).toBe(true);
  });

  it("allows SUSPENDED → ACTIVE_PRIVATE (reinstate)", () => {
    expect(isValidLifecycleTransition("SUSPENDED", "ACTIVE_PRIVATE")).toBe(
      true,
    );
  });

  it("blocks DEACTIVATED → ACTIVE_PRIVATE (no revive)", () => {
    expect(isValidLifecycleTransition("DEACTIVATED", "ACTIVE_PRIVATE")).toBe(
      false,
    );
  });

  it("allows non-DEACTIVATED statuses to DEACTIVATED", () => {
    const nonDeactivated = PRACTICE_LIFECYCLE_VALUES.filter(
      (s) => s !== "DEACTIVATED",
    );
    for (const status of nonDeactivated) {
      expect(isValidLifecycleTransition(status, "DEACTIVATED")).toBe(true);
    }
  });
});

describe("Practice status lifecycle labels", () => {
  it("has descriptive labels for all lifecycle values", () => {
    const labels: Record<string, string> = {
      PENDING_SETUP: "Pending setup",
      ONBOARDING: "Onboarding",
      PENDING_VERIFICATION: "Pending verification",
      ACTIVE_PRIVATE: "Active (private)",
      ACTIVE_PUBLIC: "Active (public)",
      SUSPENDED: "Suspended",
      DEACTIVATED: "Deactivated",
    };
    for (const [value, label] of Object.entries(labels)) {
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(3);
      expect(PRACTICE_LIFECYCLE_VALUES).toContain(value);
    }
  });
});
