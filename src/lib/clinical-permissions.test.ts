import { describe, expect, it } from "vitest";
import { roleDefaults } from "./permissions";

describe("clinical intake permissions", () => {
  it("grants clinical intake and AI assistance to clinicians but not reception or billing", () => {
    expect(roleDefaults.DOCTOR).toEqual(expect.arrayContaining(["VIEW_CLINICAL_INTAKE", "USE_CLINICAL_AI"]));
    expect(roleDefaults.RECEPTIONIST).not.toContain("VIEW_CLINICAL_INTAKE");
    expect(roleDefaults.BILLING).not.toContain("USE_CLINICAL_AI");
  });
});
