import { describe, expect, it } from "vitest";
import { evaluateSubscriptionAccess } from "./subscription-access";

const now = new Date("2026-07-21T12:00:00Z");

describe("subscription write access", () => {
  it("allows active and not-yet-expired grace-period subscriptions", () => {
    expect(
      evaluateSubscriptionAccess(
        "ACTIVE",
        { status: "ACTIVE", graceUntil: null },
        now,
      ).allowed,
    ).toBe(true);
    expect(
      evaluateSubscriptionAccess(
        "OVERDUE",
        { status: "OVERDUE", graceUntil: new Date("2026-07-22T00:00:00Z") },
        now,
      ).allowed,
    ).toBe(true);
  });

  it("blocks new writes after grace and for suspended subscriptions", () => {
    expect(
      evaluateSubscriptionAccess(
        "OVERDUE",
        { status: "OVERDUE", graceUntil: new Date("2026-07-20T00:00:00Z") },
        now,
      ).allowed,
    ).toBe(false);
    expect(
      evaluateSubscriptionAccess(
        "SUSPENDED",
        { status: "SUSPENDED", graceUntil: null },
        now,
      ).allowed,
    ).toBe(false);
  });

  it("keeps legacy practices without a subscription usable", () => {
    expect(evaluateSubscriptionAccess("ACTIVE", undefined, now).allowed).toBe(
      true,
    );
  });
});
