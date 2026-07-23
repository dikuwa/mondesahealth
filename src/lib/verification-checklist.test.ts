import { describe, expect, it } from "vitest";

// Re-export the definitions from the route so we can test them
// We test the logic directly since the route exports CHECKLIST_DEFINITIONS
import { CHECKLIST_DEFINITIONS } from "@/app/api/provider-applications/checklist/route";

describe("CHECKLIST_DEFINITIONS", () => {
  it("has exactly 10 checklist items", () => {
    expect(CHECKLIST_DEFINITIONS).toHaveLength(10);
  });

  it("includes all required verification items", () => {
    const keys = CHECKLIST_DEFINITIONS.map((d) => d.key);
    expect(keys).toContain("practice_identity_confirmed");
    expect(keys).toContain("owner_identity_confirmed");
    expect(keys).toContain("professional_registration_confirmed");
    expect(keys).toContain("practice_number_confirmed");
    expect(keys).toContain("contact_details_confirmed");
    expect(keys).toContain("address_evidence_confirmed");
    expect(keys).toContain("documents_readable");
    expect(keys).toContain("no_patient_data_detected");
    expect(keys).toContain("duplicate_checked");
    expect(keys).toContain("approval_recommendation");
  });

  it("has unique keys", () => {
    const keys = CHECKLIST_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has human-readable labels", () => {
    for (const item of CHECKLIST_DEFINITIONS) {
      expect(item.label).toBeTruthy();
      expect(item.label.length).toBeGreaterThan(5);
    }
  });
});
