export type DiagnosisSelection = { isPrimary: boolean; validForClinicalUse?: boolean; validForPrimary?: boolean };
export type ClaimLineAmount = { quantity: number; rate: number };
export type BatchCandidate = { medicalAidFundId: string | null; status: string; isResubmission: boolean };

export function calculateClaimTotal(lines: ClaimLineAmount[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.quantity * line.rate, 0) * 100) / 100;
}

export function diagnosisRuleErrors(diagnoses: DiagnosisSelection[]) {
  const errors: string[] = [];
  if (diagnoses.filter((item) => item.isPrimary).length !== 1) errors.push("ONE_PRIMARY_REQUIRED");
  if (diagnoses.filter((item) => !item.isPrimary).length > 9) errors.push("TOO_MANY_SECONDARY");
  if (diagnoses.some((item) => item.validForClinicalUse === false)) errors.push("INVALID_FOR_CLINICAL_USE");
  if (diagnoses.some((item) => item.isPrimary && item.validForPrimary === false)) errors.push("INVALID_FOR_PRIMARY");
  return errors;
}

export function batchCandidateIsEligible(candidate: BatchCandidate, fundId: string, submissionType: "FIRST_SUBMISSION" | "RESUBMISSION") {
  return candidate.medicalAidFundId === fundId
    && candidate.status === "READY_TO_SUBMIT"
    && candidate.isResubmission === (submissionType === "RESUBMISSION");
}

export function claimIsEditable(status: string) {
  return !["SUBMITTED", "ACKNOWLEDGED", "PARTIALLY_PAID", "PAID", "REJECTED", "RESUBMITTED"].includes(status);
}
