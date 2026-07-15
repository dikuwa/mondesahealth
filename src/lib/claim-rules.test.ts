import { describe, expect, it } from "vitest";
import { batchCandidateIsEligible, calculateClaimTotal, claimIsEditable, diagnosisRuleErrors } from "./claim-rules";

describe("medical-aid claim rules", () => {
  it("requires exactly one primary and limits secondary diagnoses", () => {
    expect(diagnosisRuleErrors([])).toContain("ONE_PRIMARY_REQUIRED");
    expect(diagnosisRuleErrors([{ isPrimary: true }, { isPrimary: true }])).toContain("ONE_PRIMARY_REQUIRED");
    expect(diagnosisRuleErrors([{ isPrimary: true }, ...Array.from({ length: 10 }, () => ({ isPrimary: false }))])).toContain("TOO_MANY_SECONDARY");
    expect(diagnosisRuleErrors([{ isPrimary: true }, ...Array.from({ length: 9 }, () => ({ isPrimary: false }))])).toEqual([]);
  });

  it("rejects invalid clinical and primary selections", () => {
    expect(diagnosisRuleErrors([{ isPrimary: true, validForClinicalUse: false, validForPrimary: true }])).toContain("INVALID_FOR_CLINICAL_USE");
    expect(diagnosisRuleErrors([{ isPrimary: true, validForClinicalUse: true, validForPrimary: false }])).toContain("INVALID_FOR_PRIMARY");
  });

  it("calculates claim totals on numeric line values", () => {
    expect(calculateClaimTotal([{ quantity: 2, rate: 125.25 }, { quantity: 1, rate: 99.5 }])).toBe(350);
  });

  it("only batches ready claims for the selected fund and submission type", () => {
    const claim = { medicalAidFundId: "nmc", status: "READY_TO_SUBMIT", isResubmission: false };
    expect(batchCandidateIsEligible(claim, "nmc", "FIRST_SUBMISSION")).toBe(true);
    expect(batchCandidateIsEligible(claim, "psemas", "FIRST_SUBMISSION")).toBe(false);
    expect(batchCandidateIsEligible(claim, "nmc", "RESUBMISSION")).toBe(false);
  });

  it("keeps submitted claim snapshots immutable", () => {
    expect(claimIsEditable("DRAFT")).toBe(true);
    expect(claimIsEditable("READY_TO_SUBMIT")).toBe(true);
    expect(claimIsEditable("SUBMITTED")).toBe(false);
    expect(claimIsEditable("PAID")).toBe(false);
  });
});
