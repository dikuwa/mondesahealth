import { describe, expect, it } from "vitest";
import { genericPracticeContent } from "@/lib/generic-practice-content";

describe("generic tenant content", () => {
  it("creates editable practice-specific copy without leaking original-clinic branding", () => {
    const content = genericPracticeContent("Harbour Dental", "DENTAL_PRACTICE");
    expect(content.hero.headline).toContain("Harbour Dental");
    expect(JSON.stringify(content)).not.toContain("Mondesa Health Polyclinic");
    expect(content.hero.trustPoints).toContain("Your information stays with this practice");
  });
});
