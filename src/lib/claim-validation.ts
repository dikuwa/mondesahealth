import { differenceInYears } from "date-fns";
import { db } from "@/lib/db";
import { calculateClaimTotal, diagnosisRuleErrors } from "@/lib/claim-rules";

export type ValidationMessage = { level: "ERROR" | "WARNING" | "INFO"; field: string; message: string };

export async function validateClaim(claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId }, include: { patient: true, patientMedicalAid: { include: { medicalAid: true, consents: { orderBy: { consentDate: "desc" }, take: 1 } } }, medicalAidFund: true, lines: { include: { procedureItem: true, diagnosisCodes: { include: { icd10Code: true }, orderBy: { sortOrder: "asc" } } } } } });
  if (!claim) throw new Error("Claim not found.");
  const practice = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  const messages: ValidationMessage[] = [];
  const error = (field: string, message: string) => messages.push({ level: "ERROR", field, message });
  const warning = (field: string, message: string) => messages.push({ level: "WARNING", field, message });
  if (!claim.patientMedicalAid) error("membership", "Select the patient’s medical-aid record.");
  if (!claim.medicalAidFund?.active) error("fund", "Select an active medical-aid fund.");
  if (!claim.patientMedicalAid?.membershipNumber) error("membershipNumber", "Membership number is required.");
  if (!claim.patientMedicalAid?.principalName) error("principalName", "Principal member is required.");
  if (!claim.patientMedicalAid?.relationship) error("relationship", "Relationship to the principal member is required.");
  if (!claim.patientMedicalAid?.dependantCode) error("dependantCode", "Dependant code is required.");
  if (claim.patientMedicalAid?.consents[0]?.consentStatus !== "GRANTED") error("consent", "Current ICD-10 disclosure consent must be granted.");
  if (!practice?.practiceName) error("practice", "Practice name is not configured.");
  if (!practice?.practiceNumber || practice.practiceNumber.includes("Pending")) error("practiceNumber", "Practice number is not configured.");
  if (!claim.practitioner) error("provider", "Treating provider is required.");
  if (!practice?.claimContactName || !practice.claimPhone || !practice.claimEmail) error("claimContact", "Practice claim contact details are incomplete.");
  if (!claim.serviceDateFrom || !claim.serviceDateTo) error("serviceDates", "Service-date range is required.");
  if (claim.serviceDateFrom && claim.serviceDateTo && claim.serviceDateFrom > claim.serviceDateTo) error("serviceDates", "Service-date range is invalid.");
  if (!claim.lines.length) error("lines", "Add at least one claim line.");
  const age = claim.patient.dateOfBirth ? differenceInYears(claim.serviceDateFrom || new Date(), claim.patient.dateOfBirth) : null;
  for (const [index, line] of claim.lines.entries()) {
    const field = `lines.${index}`;
    if (!line.serviceDate) error(field, "Service date is required.");
    if (line.serviceDate && claim.serviceDateFrom && claim.serviceDateTo && (line.serviceDate < claim.serviceDateFrom || line.serviceDate > claim.serviceDateTo)) error(field, "Service date is outside the claim range.");
    if (!line.tariffCode && !line.procedureCodeSnapshot) error(field, "Procedure code is required.");
    if (!line.description) error(field, "Procedure description is required.");
    if (line.quantity <= 0 || line.rate <= 0) error(field, "Quantity and unit amount must be greater than zero.");
    if (line.procedureItem?.requiresNappiCode && !line.nappiCode) error(field, "NAPPI code is required for this procedure.");
    if (line.procedureItem?.requiresPreAuthorisation && !line.preAuthorisationNumber) error(field, "Pre-authorisation is required for this procedure.");
    const diagnosisErrors = diagnosisRuleErrors(line.diagnosisCodes.map((code) => ({ isPrimary: code.isPrimary, validForClinicalUse: code.icd10Code?.validForClinicalUse, validForPrimary: code.icd10Code?.validForPrimary })));
    if (diagnosisErrors.includes("ONE_PRIMARY_REQUIRED")) error(field, "Each claim line must have exactly one primary ICD-10 code.");
    if (diagnosisErrors.includes("TOO_MANY_SECONDARY")) error(field, "A claim line can have at most nine secondary ICD-10 codes.");
    for (const code of line.diagnosisCodes) {
      if (!code.icd10Code?.validForClinicalUse) error(field, `${code.codeSnapshot} is not valid for clinical use.`);
      if (code.isPrimary && !code.icd10Code?.validForPrimary) error(field, `${code.codeSnapshot} is not valid as a primary code.`);
      if (age !== null && code.icd10Code?.minimumAge !== null && code.icd10Code?.minimumAge !== undefined && age < code.icd10Code.minimumAge) warning(field, `${code.codeSnapshot} has an age restriction requiring review.`);
      if (age !== null && code.icd10Code?.maximumAge !== null && code.icd10Code?.maximumAge !== undefined && age > code.icd10Code.maximumAge) warning(field, `${code.codeSnapshot} has an age restriction requiring review.`);
      if (code.icd10Code?.genderRestriction && claim.patient.gender && !code.icd10Code.genderRestriction.toLowerCase().includes(claim.patient.gender.toLowerCase().charAt(0))) warning(field, `${code.codeSnapshot} has a gender restriction requiring review.`);
      if (["U98.0", "U98.1"].includes(code.codeSnapshot)) warning(field, `${code.codeSnapshot} is a disclosure code and must only be used when confirmed by the authorised provider.`);
    }
  }
  const total = calculateClaimTotal(claim.lines);
  if (Math.abs(total - claim.amountSubmitted) > 0.01) error("total", "Claim total does not match the sum of claim lines.");
  if (claim.lines.length) {
    const duplicate = await db.claim.findFirst({ where: { id: { not: claim.id }, patientId: claim.patientId, medicalAidFundId: claim.medicalAidFundId, status: { not: "CANCELLED" }, serviceDateFrom: claim.serviceDateFrom, amountSubmitted: total } });
    if (duplicate) warning("duplicate", `Possible duplicate of ${duplicate.claimNumber}.`);
  }
  if (claim.isResubmission && !claim.originalClaimId) error("resubmission", "A resubmission must link to the original claim.");
  messages.push({ level: "INFO", field: "total", message: `Server-calculated total: N$ ${total.toFixed(2)}` });
  return { claim, practice, total, valid: !messages.some((message) => message.level === "ERROR"), messages };
}
