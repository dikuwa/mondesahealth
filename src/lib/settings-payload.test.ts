import { describe, expect, it } from "vitest";
import { classifySettingsRequest, isEditableSettingsSection, settingsPayloadForSection } from "./settings-payload";

describe("settings request routing", () => {
  it("routes a legacy complete settings payload to details, not AI", () => {
    expect(classifySettingsRequest({ practiceName: "Updated practice", aiIntakeEnabled: true, aiImageEnabled: false })).toBe("DETAILS");
  });

  it("still recognises an AI-only settings request", () => {
    expect(classifySettingsRequest({ aiIntakeEnabled: true, aiImageEnabled: false })).toBe("AI");
  });

  it("separates shared editable sections from independently managed tabs", () => {
    expect(isEditableSettingsSection("practice")).toBe(true);
    expect(isEditableSettingsSection("medical-aids")).toBe(false);
  });

  it("sends only the fields belonging to the active settings section", () => {
    const payload = settingsPayloadForSection("practice", {
      practiceName: "Updated practice",
      phone: "+264 83 783 7216",
      doctorName: "Clinician",
      practiceNumber: "123",
      registrationNumber: "456",
      whatsapp: "+264 83 783 7216",
      email: "hello@example.com",
      address: "Mondesa",
      aiIntakeEnabled: true,
      tagline: "Not part of this save",
    });
    expect(payload).toEqual({
      practiceName: "Updated practice",
      doctorName: "Clinician",
      practiceNumber: "123",
      registrationNumber: "456",
      phone: "+264 83 783 7216",
      whatsapp: "+264 83 783 7216",
      email: "hello@example.com",
      address: "Mondesa",
    });
  });
});
