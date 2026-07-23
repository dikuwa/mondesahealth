import { describe, expect, it } from "vitest";
import { isValidLifecycleTransition, PRACTICE_LIFECYCLE_VALUES } from "./practice-lifecycle";

describe("Practice lifecycle transitions", () => {
  it("allows PENDING_SETUP → ONBOARDING", () => {
    expect(isValidLifecycleTransition("PENDING_SETUP", "ONBOARDING")).toBe(true);
  });

  it("blocks PENDING_SETUP → ACTIVE_PRIVATE (skip onboarding)", () => {
    expect(isValidLifecycleTransition("PENDING_SETUP", "ACTIVE_PRIVATE")).toBe(false);
  });

  it("allows ONBOARDING → PENDING_VERIFICATION", () => {
    expect(isValidLifecycleTransition("ONBOARDING", "PENDING_VERIFICATION")).toBe(true);
  });

  it("allows PENDING_VERIFICATION → ACTIVE_PRIVATE", () => {
    expect(isValidLifecycleTransition("PENDING_VERIFICATION", "ACTIVE_PRIVATE")).toBe(true);
  });

  it("allows ACTIVE_PRIVATE → ACTIVE_PUBLIC", () => {
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "ACTIVE_PUBLIC")).toBe(true);
  });

  it("allows ACTIVE_PUBLIC → ACTIVE_PRIVATE (unpublish)", () => {
    expect(isValidLifecycleTransition("ACTIVE_PUBLIC", "ACTIVE_PRIVATE")).toBe(true);
  });

  it("allows ACTIVE_PRIVATE → SUSPENDED", () => {
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "SUSPENDED")).toBe(true);
  });

  it("allows SUSPENDED → ACTIVE_PRIVATE (reinstate)", () => {
    expect(isValidLifecycleTransition("SUSPENDED", "ACTIVE_PRIVATE")).toBe(true);
  });

  it("allows any active status → DEACTIVATED", () => {
    expect(isValidLifecycleTransition("PENDING_SETUP", "DEACTIVATED")).toBe(true);
    expect(isValidLifecycleTransition("ONBOARDING", "DEACTIVATED")).toBe(true);
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "DEACTIVATED")).toBe(true);
  });

  it("blocks DEACTIVATED → any other status", () => {
    expect(isValidLifecycleTransition("DEACTIVATED", "ACTIVE_PRIVATE")).toBe(false);
    expect(isValidLifecycleTransition("DEACTIVATED", "SUSPENDED")).toBe(false);
  });

  it("blocks transitions from an unknown status", () => {
    expect(isValidLifecycleTransition("UNKNOWN", "ACTIVE_PRIVATE")).toBe(false);
  });

  it("exports all valid lifecycle values", () => {
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("PENDING_SETUP");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("ACTIVE_PRIVATE");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("ACTIVE_PUBLIC");
    expect(PRACTICE_LIFECYCLE_VALUES).toContain("DEACTIVATED");
  });
});
