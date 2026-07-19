import { describe, expect, it } from "vitest";
import { aiIntakeAvailable, detectRedFlags } from "./intake-safety";

describe("patient intake safety", () => {
  it("detects explicit time-critical descriptions without diagnosing", () => {
    expect(detectRedFlags("I have crushing chest pain")).toContain("SEVERE_CHEST_PAIN");
    expect(detectRedFlags("My throat is closing and I cannot breathe")).toEqual(expect.arrayContaining(["BREATHING_DIFFICULTY", "SEVERE_ALLERGIC_REACTION"]));
    expect(detectRedFlags("mild headache for two days")).toEqual([]);
  });
  it("requires global enablement and respects service/provider opt-out", () => {
    expect(aiIntakeAvailable({ globalEnabled: false })).toBe(false);
    expect(aiIntakeAvailable({ globalEnabled: true, serviceEnabled: null, providerEnabled: null })).toBe(true);
    expect(aiIntakeAvailable({ globalEnabled: true, serviceEnabled: false })).toBe(false);
    expect(aiIntakeAvailable({ globalEnabled: true, providerEnabled: false })).toBe(false);
  });
});
