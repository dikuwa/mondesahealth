import { describe, expect, it } from "vitest";
import { windhoekGreeting } from "./greeting";
describe("windhoekGreeting", () => {
  it("greets in the morning", () =>
    expect(windhoekGreeting(new Date("2026-07-14T06:00:00Z"))).toBe(
      "Good morning",
    ));
  it("greets in the afternoon", () =>
    expect(windhoekGreeting(new Date("2026-07-14T12:00:00Z"))).toBe(
      "Good afternoon",
    ));
  it("greets in the evening", () =>
    expect(windhoekGreeting(new Date("2026-07-14T18:00:00Z"))).toBe(
      "Good evening",
    ));
});
