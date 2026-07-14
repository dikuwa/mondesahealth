import { describe, expect, it } from "vitest";
import { canTransition, nextAppointmentStatus } from "./appointment-state";
describe("appointment state flow", () => {
  it("permits documented transitions", () => {
    expect(canTransition("NEW_REQUEST", "CONFIRM")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCEL")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETE")).toBe(true);
    expect(nextAppointmentStatus("NO_SHOW")).toBe("NO_SHOW");
  });
  it("rejects invalid terminal transitions", () => {
    expect(canTransition("CANCELLED", "CONFIRM")).toBe(false);
    expect(canTransition("COMPLETED", "CANCEL")).toBe(false);
    expect(canTransition("NEW_REQUEST", "COMPLETE")).toBe(false);
  });
});
