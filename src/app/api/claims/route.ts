import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { validateClaim } from "@/lib/claim-validation";
import { calculateClaimTotal, claimIsEditable, diagnosisRuleErrors } from "@/lib/claim-rules";
import { db } from "@/lib/db";
import { ref } from "@/lib/utils";

const diagnosis = z.object({ icd10CodeId: z.string(), isPrimary: z.boolean(), sortOrder: z.number().int().min(0) });
const line = z.object({ id: z.string().optional(), serviceDate: z.coerce.date(), procedureItemId: z.string().nullable().optional(), tariffCode: z.string().trim().min(1), description: z.string().trim().min(2), quantity: z.number().positive(), rate: z.number().positive(), modifier: z.string().trim().max(40).nullable().optional(), nappiCode: z.string().trim().max(80).nullable().optional(), medicationDescription: z.string().trim().max(500).nullable().optional(), referralDiagnosis: z.string().trim().max(500).nullable().optional(), preAuthorisationNumber: z.string().trim().max(120).nullable().optional(), clinicalClaimNote: z.string().trim().max(1000).nullable().optional(), sortOrder: z.number().int().min(0), diagnoses: z.array(diagnosis).max(10) });
const saveSchema = z.object({ action: z.literal("SAVE"), id: z.string(), patientMedicalAidId: z.string(), medicalAidFundId: z.string(), claimType: z.enum(["DIRECT_MEDICAL_AID", "PATIENT_REIMBURSEMENT"]), serviceDateFrom: z.coerce.date(), serviceDateTo: z.coerce.date(), practitioner: z.string().trim().min(2), internalNotes: z.string().trim().max(2000).nullable().optional(), lines: z.array(line).min(1) });

export async function POST(request: Request) {
  const session = await requirePermission("EDIT_CLAIMS");
  if (!session) return NextResponse.json({ error: "You do not have permission to create claims." }, { status: 403 });
  const parsed = z.object({ appointmentId: z.string().optional(), patientId: z.string().optional() }).refine((value) => value.appointmentId || value.patientId).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a patient or completed appointment." }, { status: 400 });
  const appointment = parsed.data.appointmentId ? await db.appointment.findUnique({ where: { id: parsed.data.appointmentId }, include: { patient: { include: { memberships: { where: { current: true }, include: { medicalAid: true } } } } } }) : null;
  if (appointment && appointment.status !== "COMPLETED") return NextResponse.json({ error: "Only completed consultations can become claims." }, { status: 409 });
  const patientId = appointment?.patientId || parsed.data.patientId!;
  const patient = appointment?.patient || await db.patient.findUnique({ where: { id: patientId }, include: { memberships: { where: { current: true }, include: { medicalAid: true } } } });
  if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  const membership = patient.memberships[0], practice = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  const claim = await db.$transaction(async (tx) => {
    const created = await tx.claim.create({ data: { claimNumber: ref("CLM"), appointmentId: appointment?.id, patientId, patientMedicalAidId: membership?.id, medicalAidFundId: membership?.medicalAidId, createdByUserId: session.id, consultationDate: appointment?.startAt || new Date(), serviceDateFrom: appointment?.startAt || new Date(), serviceDateTo: appointment?.startAt || new Date(), practitioner: practice?.doctorName || "", practiceNumber: practice?.practiceNumber || "", medicalAidSnapshot: membership?.medicalAid?.name || membership?.customFundName || null, membershipSnapshot: membership?.membershipNumber, principalSnapshot: membership?.principalName, dependantSnapshot: membership?.dependantCode, planSnapshot: membership?.plan, status: "NEEDS_INFORMATION" } });
    await tx.activityLog.create({ data: { userId: session.id, action: "CLAIM_CREATED", entityType: "Claim", entityId: created.id, summary: `Claim ${created.claimNumber} created` } }); return created;
  });
  return NextResponse.json(claim, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (body.action === "SAVE") {
    const session = await requirePermission("EDIT_CLAIMS"); if (!session) return NextResponse.json({ error: "You do not have permission to edit claims." }, { status: 403 });
    const parsed = saveSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Claim details are incomplete." }, { status: 400 });
    const existing = await db.claim.findUnique({ where: { id: parsed.data.id } });
    if (!existing || !claimIsEditable(existing.status)) return NextResponse.json({ error: "Submitted claims cannot be edited. Create a resubmission instead." }, { status: 409 });
    const codes = [...new Set(parsed.data.lines.flatMap((item) => item.diagnoses.map((entry) => entry.icd10CodeId)))];
    const codeRows = await db.icd10Code.findMany({ where: { id: { in: codes }, import: { active: true } } });
    if (codeRows.length !== codes.length) return NextResponse.json({ error: "One or more ICD-10 codes are not from the active dataset." }, { status: 400 });
    const byId = new Map(codeRows.map((code) => [code.id, code]));
    for (const item of parsed.data.lines) {
      const ruleErrors = diagnosisRuleErrors(item.diagnoses.map((entry) => ({
        isPrimary: entry.isPrimary,
        validForClinicalUse: byId.get(entry.icd10CodeId)?.validForClinicalUse,
        validForPrimary: byId.get(entry.icd10CodeId)?.validForPrimary,
      })));
      if (ruleErrors.includes("INVALID_FOR_CLINICAL_USE") || ruleErrors.includes("INVALID_FOR_PRIMARY")) return NextResponse.json({ error: "An ICD-10 code is not valid for clinical use or for its selected position." }, { status: 400 });
    }
    const total = calculateClaimTotal(parsed.data.lines);
    await db.$transaction(async (tx) => {
      await tx.claimLine.deleteMany({ where: { claimId: existing.id } });
      await tx.claim.update({ where: { id: existing.id }, data: { patientMedicalAidId: parsed.data.patientMedicalAidId, medicalAidFundId: parsed.data.medicalAidFundId, claimType: parsed.data.claimType, serviceDateFrom: parsed.data.serviceDateFrom, serviceDateTo: parsed.data.serviceDateTo, consultationDate: parsed.data.serviceDateFrom, practitioner: parsed.data.practitioner, internalNotes: parsed.data.internalNotes || null, amountSubmitted: total, status: "DRAFT", validationState: null } });
      for (const item of parsed.data.lines) {
        const created = await tx.claimLine.create({ data: { claimId: existing.id, serviceDate: item.serviceDate, procedureItemId: item.procedureItemId || null, tariffCode: item.tariffCode, procedureCodeSnapshot: item.tariffCode, description: item.description, procedureDescriptionSnapshot: item.description, quantity: item.quantity, rate: item.rate, claimed: item.quantity * item.rate, modifier: item.modifier || null, nappiCode: item.nappiCode || null, medicationDescription: item.medicationDescription || null, referralDiagnosis: item.referralDiagnosis || null, preAuthorisationNumber: item.preAuthorisationNumber || null, clinicalClaimNote: item.clinicalClaimNote || null, sortOrder: item.sortOrder } });
        await tx.claimLineIcd10Code.createMany({ data: item.diagnoses.map((entry) => { const code = byId.get(entry.icd10CodeId)!; return { claimLineId: created.id, icd10CodeId: code.id, codeSnapshot: code.code, descriptionSnapshot: code.description, position: entry.isPrimary ? "PRIMARY" : "SECONDARY", isPrimary: entry.isPrimary, sortOrder: entry.sortOrder }; }) });
      }
      await tx.activityLog.create({ data: { userId: session.id, action: "CLAIM_UPDATED", entityType: "Claim", entityId: existing.id, summary: `Claim ${existing.claimNumber} updated` } });
    });
    return NextResponse.json({ ok: true, total });
  }
  if (body.action === "VALIDATE") {
    const session = await requirePermission("VALIDATE_CLAIMS"); if (!session) return NextResponse.json({ error: "You do not have permission to validate claims." }, { status: 403 });
    const id = z.string().parse(body.id), result = await validateClaim(id);
    const membership = result.claim.patientMedicalAid, patient = result.claim.patient, practice = result.practice;
    await db.$transaction(async (tx) => {
      await tx.claim.update({ where: { id }, data: { status: result.valid ? "READY_TO_SUBMIT" : "NEEDS_INFORMATION", validationState: JSON.stringify(result.messages), amountSubmitted: result.total, ...(result.valid ? { patientSnapshot: JSON.stringify({ fullName: patient.fullName, patientNumber: patient.patientNumber, dateOfBirth: patient.dateOfBirth, gender: patient.gender, identityNumber: patient.identityNumber }), membershipDetailSnapshot: JSON.stringify({ fund: membership?.medicalAid?.name, membershipNumber: membership?.membershipNumber, principalName: membership?.principalName, principalId: membership?.principalId, relationship: membership?.relationship, dependantCode: membership?.dependantCode, plan: membership?.plan }), practiceSnapshot: JSON.stringify({ practiceName: practice?.practiceName, practiceNumber: practice?.practiceNumber, address: practice?.address, contact: practice?.claimContactName, phone: practice?.claimPhone, email: practice?.claimEmail }), providerSnapshot: JSON.stringify({ name: result.claim.practitioner, registrationNumber: practice?.registrationNumber }), consentSnapshot: JSON.stringify(membership?.consents[0] || null) } : {}) } });
      await tx.activityLog.create({ data: { userId: session.id, action: result.valid ? "CLAIM_MARKED_READY" : "CLAIM_VALIDATED", entityType: "Claim", entityId: id, summary: `Claim ${result.claim.claimNumber} validation ${result.valid ? "passed" : "needs information"}` } });
    });
    return NextResponse.json({ valid: result.valid, messages: result.messages });
  }
  if (body.action === "OUTCOME") {
    const session = await requirePermission("RECORD_CLAIM_OUTCOMES"); if (!session) return NextResponse.json({ error: "You do not have permission to record claim outcomes." }, { status: 403 });
    const parsed = z.object({ id: z.string(), status: z.enum(["ACKNOWLEDGED", "PARTIALLY_PAID", "PAID", "REJECTED", "RESUBMISSION_REQUIRED", "CANCELLED"]), reason: z.string().trim().min(2), rejectionCode: z.string().trim().max(80).optional(), rejectionDescription: z.string().trim().max(500).optional(), amountApproved: z.number().nonnegative().optional(), amountPaid: z.number().nonnegative().optional(), patientResponsibility: z.number().nonnegative().optional(), remittanceReference: z.string().trim().max(160).optional(), paymentDate: z.coerce.date().optional() }).superRefine((value, context) => {
      if (value.status === "REJECTED" && !value.rejectionDescription) context.addIssue({ code: "custom", path: ["rejectionDescription"], message: "Rejection description is required." });
      if (["PARTIALLY_PAID", "PAID"].includes(value.status) && (!value.amountPaid || !value.paymentDate)) context.addIssue({ code: "custom", path: ["amountPaid"], message: "Payment amount and date are required." });
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Outcome details are incomplete." }, { status: 400 });
    const claim = await db.claim.findUnique({ where: { id: parsed.data.id } }); if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    const allowedFrom: Record<string, string[]> = { ACKNOWLEDGED: ["SUBMITTED"], PARTIALLY_PAID: ["SUBMITTED", "ACKNOWLEDGED", "PARTIALLY_PAID"], PAID: ["SUBMITTED", "ACKNOWLEDGED", "PARTIALLY_PAID"], REJECTED: ["SUBMITTED", "ACKNOWLEDGED"], RESUBMISSION_REQUIRED: ["SUBMITTED", "ACKNOWLEDGED", "REJECTED"], CANCELLED: ["DRAFT", "NEEDS_INFORMATION", "READY_TO_SUBMIT"] };
    if (!allowedFrom[parsed.data.status]?.includes(claim.status)) return NextResponse.json({ error: `A ${claim.status.toLowerCase().replaceAll("_", " ")} claim cannot move to ${parsed.data.status.toLowerCase().replaceAll("_", " ")}.` }, { status: 409 });
    await db.$transaction(async (tx) => { const amount = parsed.data.amountPaid || 0, paymentNote = `Claim outcome${parsed.data.remittanceReference ? ` · ${parsed.data.remittanceReference}` : ""}`; if (amount > 0) { const duplicate = await tx.payment.findFirst({ where: { claimId: claim.id, payer: "MEDICAL_AID", amount, notes: paymentNote } }); if (duplicate) throw new Error("This medical-aid payment has already been recorded."); const payment = await tx.payment.create({ data: { reference: ref("PAY"), claimId: claim.id, patientId: claim.patientId, userId: session.id, amount, method: "MEDICAL_AID_PAYMENT", payer: "MEDICAL_AID", paidAt: parsed.data.paymentDate || new Date(), notes: paymentNote } }); await tx.receipt.create({ data: { number: ref("REC"), paymentId: payment.id } }); if (claim.appointmentId) { const invoice = await tx.invoice.findUnique({ where: { appointmentId: claim.appointmentId } }); if (invoice) await tx.invoice.update({ where: { id: invoice.id }, data: { medicalAidPaid: { increment: amount }, status: invoice.patientPaid + invoice.medicalAidPaid + amount >= invoice.total ? "PAID" : "PARTIALLY_PAID" } }); } } await tx.claim.update({ where: { id: claim.id }, data: { status: parsed.data.status, amountApproved: parsed.data.amountApproved ?? claim.amountApproved, patientShortfall: parsed.data.patientResponsibility ?? claim.patientShortfall, amountReceived: amount ? { increment: amount } : undefined, acknowledgedAt: parsed.data.status === "ACKNOWLEDGED" ? new Date() : claim.acknowledgedAt } }); await tx.claimStatusEvent.create({ data: { claimId: claim.id, previousStatus: claim.status, newStatus: parsed.data.status, reason: parsed.data.reason, rejectionCode: parsed.data.rejectionCode, rejectionDescription: parsed.data.rejectionDescription, changedByUserId: session.id } }); await tx.activityLog.create({ data: { userId: session.id, action: `CLAIM_${parsed.data.status}`, entityType: "Claim", entityId: claim.id, summary: `Claim ${claim.claimNumber} marked ${parsed.data.status.replaceAll("_", " ").toLowerCase()}` } }); });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "RESUBMIT") {
    const session = await requirePermission("EDIT_CLAIMS"); if (!session) return NextResponse.json({ error: "You do not have permission to create resubmissions." }, { status: 403 });
    const original = await db.claim.findUnique({ where: { id: z.string().parse(body.id) }, include: { lines: { include: { diagnosisCodes: true } } } });
    if (!original || !["REJECTED", "RESUBMISSION_REQUIRED"].includes(original.status)) return NextResponse.json({ error: "Only rejected claims or claims requiring resubmission can be copied." }, { status: 409 });
    const copy = await db.$transaction(async (tx) => { const created = await tx.claim.create({ data: { claimNumber: ref("CLM"), patientId: original.patientId, appointmentId: null, patientMedicalAidId: original.patientMedicalAidId, medicalAidFundId: original.medicalAidFundId, createdByUserId: session.id, originalClaimId: original.id, isResubmission: true, submissionType: "RESUBMISSION", claimType: original.claimType, status: "DRAFT", consultationDate: original.consultationDate, serviceDateFrom: original.serviceDateFrom, serviceDateTo: original.serviceDateTo, practitioner: original.practitioner, practiceNumber: original.practiceNumber, medicalAidSnapshot: original.medicalAidSnapshot, membershipSnapshot: original.membershipSnapshot, principalSnapshot: original.principalSnapshot, dependantSnapshot: original.dependantSnapshot, planSnapshot: original.planSnapshot, amountSubmitted: original.amountSubmitted, lines: { create: original.lines.map((item) => ({ serviceDate: item.serviceDate, procedureItemId: item.procedureItemId, tariffCode: item.tariffCode, procedureCodeSnapshot: item.procedureCodeSnapshot, description: item.description, procedureDescriptionSnapshot: item.procedureDescriptionSnapshot, quantity: item.quantity, rate: item.rate, claimed: item.claimed, modifier: item.modifier, nappiCode: item.nappiCode, medicationDescription: item.medicationDescription, referralDiagnosis: item.referralDiagnosis, preAuthorisationNumber: item.preAuthorisationNumber, clinicalClaimNote: item.clinicalClaimNote, sortOrder: item.sortOrder, diagnosisCodes: { create: item.diagnosisCodes.map((code) => ({ icd10CodeId: code.icd10CodeId, codeSnapshot: code.codeSnapshot, descriptionSnapshot: code.descriptionSnapshot, position: code.position, isPrimary: code.isPrimary, sortOrder: code.sortOrder })) } })) } } }); await tx.claim.update({ where: { id: original.id }, data: { status: "RESUBMITTED" } }); await tx.claimStatusEvent.create({ data: { claimId: original.id, previousStatus: original.status, newStatus: "RESUBMITTED", reason: `Resubmission ${created.claimNumber} created`, changedByUserId: session.id } }); await tx.activityLog.create({ data: { userId: session.id, action: "CLAIM_RESUBMISSION_CREATED", entityType: "Claim", entityId: created.id, summary: `Resubmission ${created.claimNumber} created from ${original.claimNumber}` } }); return created; });
    return NextResponse.json(copy, { status: 201 });
  }
  return NextResponse.json({ error: "Unsupported claim action." }, { status: 400 });
}
