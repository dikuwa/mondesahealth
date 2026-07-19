import { describe, expect, it } from "vitest";
import { emergencyMessage, neutralEmergencyMessage, orderEmergencyContacts, primaryEmergencyContact, validEmergencyPhone } from "./emergency";

const contacts = [
  { id: "later", active: true, primary: false, sortOrder: 3, label: "Regional", phone: "+26461234567" },
  { id: "inactive-primary", active: false, primary: true, sortOrder: 0, label: "Inactive", phone: "+264811111111" },
  { id: "primary", active: true, primary: true, sortOrder: 8, label: "Practice emergency", phone: "+264812345678" },
];

describe("emergency contacts", () => {
  it("selects the active primary contact first and excludes inactive rows", () => {
    expect(orderEmergencyContacts(contacts).map((contact) => contact.id)).toEqual(["primary", "later"]);
    expect(primaryEmergencyContact(contacts)?.id).toBe("primary");
  });
  it("accepts supported Namibian local and international formats", () => {
    expect(validEmergencyPhone("081 123 4567")).toBe(true);
    expect(validEmergencyPhone("061 234 567")).toBe(true);
    expect(validEmergencyPhone("+264 81 123 4567")).toBe(true);
    expect(validEmergencyPhone("12345")).toBe(false);
  });
  it("never invents an emergency number", () => {
    expect(emergencyMessage(null)).toContain("nearest emergency service");
    expect(emergencyMessage(null)).not.toMatch(/\b112\b/);
    expect(neutralEmergencyMessage).not.toMatch(/\b112\b/);
  });
});
