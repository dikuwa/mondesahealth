import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(join(process.cwd(), path), "utf8"); }

describe("AI intake implementation contract", () => {
  it("contains no hard-coded public emergency fallback number", () => {
    for (const path of ["src/app/book/page.tsx", "src/components/booking-form.tsx", "src/app/policies/page.tsx", "src/lib/emergency.ts"])
      expect(source(path)).not.toMatch(/\b112\b/);
  });
  it("keeps original, AI-generated and clinician-corrected content separate", () => {
    const schema = source("prisma/schema.prisma");
    expect(schema).toContain("originalReason");
    expect(schema).toContain("approvedSummary");
    expect(schema).toContain("clinicianCorrections");
  });
  it("protects clinical AI and private image routes with clinical permissions", () => {
    expect(source("src/app/api/clinical-intake/route.ts")).toContain('requirePermission("USE_CLINICAL_AI")');
    expect(source("src/app/api/intake-images/[id]/route.ts")).toContain('requirePermission("VIEW_CLINICAL_INTAKE")');
  });
  it("does not automatically save diagnosis, prescription or ICD-10 codes", () => {
    const route = source("src/app/api/clinical-intake/route.ts");
    expect(route).not.toContain("icd10Code.create");
    expect(route).not.toContain("prescription.create");
    expect(route).not.toContain("confirmedDiagnosis");
  });
});
