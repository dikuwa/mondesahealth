import { describe, expect, it } from "vitest";
import { isValidLifecycleTransition } from "./practice-lifecycle";

describe("Practice activation lifecycle transitions", () => {
  it("allows PENDING_VERIFICATION → ACTIVE_PRIVATE", () => {
    expect(isValidLifecycleTransition("PENDING_VERIFICATION", "ACTIVE_PRIVATE")).toBe(true);
  });

  it("allows PENDING_VERIFICATION → ONBOARDING (send back)", () => {
    expect(isValidLifecycleTransition("PENDING_VERIFICATION", "ONBOARDING")).toBe(true);
  });

  it("blocks PENDING_VERIFICATION → ACTIVE_PUBLIC (skip private first)", () => {
    expect(isValidLifecycleTransition("PENDING_VERIFICATION", "ACTIVE_PUBLIC")).toBe(false);
  });

  it("allows ACTIVE_PRIVATE → ACTIVE_PUBLIC", () => {
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "ACTIVE_PUBLIC")).toBe(true);
  });

  it("blocks ACTIVE_PRIVATE → PENDING_SETUP (no regression)", () => {
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "PENDING_SETUP")).toBe(false);
  });

  it("allows PENDING_SETUP → ONBOARDING", () => {
    expect(isValidLifecycleTransition("PENDING_SETUP", "ONBOARDING")).toBe(true);
  });

  it("allows ONBOARDING → PENDING_VERIFICATION", () => {
    expect(isValidLifecycleTransition("ONBOARDING", "PENDING_VERIFICATION")).toBe(true);
  });

  it("allows any status to DEACTIVATED", () => {
    expect(isValidLifecycleTransition("PENDING_SETUP", "DEACTIVATED")).toBe(true);
    expect(isValidLifecycleTransition("ONBOARDING", "DEACTIVATED")).toBe(true);
    expect(isValidLifecycleTransition("ACTIVE_PRIVATE", "DEACTIVATED")).toBe(true);
    expect(isValidLifecycleTransition("ACTIVE_PUBLIC", "DEACTIVATED")).toBe(true);
  });

  it("allows ACTIVE_PUBLIC → ACTIVE_PRIVATE (unpublish)", () => {
    expect(isValidLifecycleTransition("ACTIVE_PUBLIC", "ACTIVE_PRIVATE")).toBe(true);
  });

  it("allows SUSPENDED → ACTIVE_PRIVATE (reinstate)", () => {
    expect(isValidLifecycleTransition("SUSPENDED", "ACTIVE_PRIVATE")).toBe(true);
  });
});
