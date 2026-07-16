import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
/* eslint-disable @typescript-eslint/no-unused-vars */

const optional = z.string().trim().max(1000).nullable().optional();
const fundSchema = z.object({ entity: z.literal("FUND"), id: z.string().optional(), name: z.string().trim().min(2).max(160), abbreviation: z.string().trim().min(2).max(20), administrator: optional, claimsEmail: z.union([z.literal(""), z.string().email()]).optional(), supportEmail: z.union([z.literal(""), z.string().email()]).optional(), phone: optional, portalUrl: z.union([z.literal(""), z.string().url()]).optional(), postalAddress: optional, physicalAddress: optional, submissionInstructions: optional, acceptedSubmissionMethods: z.array(z.enum(["MANUAL", "EMAIL", "PORTAL", "MEDISWITCH", "EDI", "OTHER"])), coverSheetRequired: z.boolean(), serviceDateRangeRequired: z.boolean(), active: z.boolean(), public: z.boolean(), sortOrder: z.number().int().min(0) });
const procedureSchema = z.object({ entity: z.literal("PROCEDURE"), id: z.string().optional(), code: z.string().trim().min(1).max(60), name: z.string().trim().min(2).max(180), description: optional, category: optional, defaultAmount: z.number().nonnegative(), requiresNappiCode: z.boolean(), requiresPreAuthorisation: z.boolean(), active: z.boolean() });
const membershipSchema = z.object({ entity: z.literal("MEMBERSHIP"), id: z.string().optional(), patientId: z.string(), medicalAidId: z.string(), membershipNumber: z.string().trim().min(2).max(120), plan: optional, principalName: z.string().trim().min(2).max(180), principalId: optional, relationship: z.string().trim().min(2).max(80), dependantCode: z.string().trim().min(1).max(40), beneficiarySuffix: optional, effectiveDate: z.coerce.date().nullable().optional(), expiryDate: z.coerce.date().nullable().optional(), preAuthorisationNumber: optional, directBillingEnabled: z.boolean(), reimbursementOnly: z.boolean(), current: z.boolean(), notes: optional });
const consentSchema = z.object({ entity: z.literal("CONSENT"), patientId: z.string(), patientMedicalAidId: z.string().nullable().optional(), consentStatus: z.enum(["GRANTED", "DECLINED", "NOT_CAPTURED", "WITHDRAWN"]), consentDate: z.coerce.date(), patientOrGuardianName: z.string().trim().min(2).max(180), relationshipToPatient: optional, signatureData: optional, notes: optional });

export async function PATCH(request: Request) {
  const body = await request.json();
  if (body.entity === "FUND") {
    const session = await requirePermission("MANAGE_MEDICAL_AID_SETTINGS"); if (!session) return NextResponse.json({ error: "You do not have permission to manage funds." }, { status: 403 });
    const parsed = fundSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the fund details." }, { status: 400 });
    const { entity: _, id, ...value } = parsed.data; const data = { ...value, normalizedName: value.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), claimsEmail: value.claimsEmail || null, supportEmail: value.supportEmail || null, portalUrl: value.portalUrl || null, acceptedSubmissionMethods: JSON.stringify(value.acceptedSubmissionMethods) };
    const fund = id ? await db.medicalAid.update({ where: { id }, data }) : await db.medicalAid.create({ data });
    await db.activityLog.create({ data: { userId: session.id, action: id ? (fund.active ? "MEDICAL_AID_FUND_UPDATED" : "MEDICAL_AID_FUND_DISABLED") : "MEDICAL_AID_FUND_CREATED", entityType: "MedicalAid", entityId: fund.id, summary: `${fund.name} fund settings saved` } }); return NextResponse.json(fund);
  }
  if (body.entity === "PROCEDURE") {
    const session = await requirePermission("MANAGE_MEDICAL_AID_SETTINGS"); if (!session) return NextResponse.json({ error: "You do not have permission to manage procedures." }, { status: 403 });
    const parsed = procedureSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the procedure details." }, { status: 400 });
    const { entity: _, id, ...data } = parsed.data; const item = id ? await db.medicalAidProcedureItem.update({ where: { id }, data }) : await db.medicalAidProcedureItem.create({ data });
    await db.activityLog.create({ data: { userId: session.id, action: id ? "PROCEDURE_ITEM_UPDATED" : "PROCEDURE_ITEM_CREATED", entityType: "MedicalAidProcedureItem", entityId: item.id, summary: `${item.code} procedure item saved` } }); return NextResponse.json(item);
  }
  if (body.entity === "MEMBERSHIP") {
    const session = await requirePermission("MANAGE_MEMBERSHIPS"); if (!session) return NextResponse.json({ error: "You do not have permission to manage memberships." }, { status: 403 });
    const parsed = membershipSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the membership details." }, { status: 400 });
    if (parsed.data.effectiveDate && parsed.data.expiryDate && parsed.data.effectiveDate > parsed.data.expiryDate) return NextResponse.json({ error: "Membership expiry must be after the start date." }, { status: 400 });
    const { entity: _, id, ...data } = parsed.data; const membership = await db.$transaction(async (tx) => { if (data.current) await tx.patientMedicalAid.updateMany({ where: { patientId: data.patientId, id: id ? { not: id } : undefined }, data: { current: false } }); return id ? tx.patientMedicalAid.update({ where: { id }, data }) : tx.patientMedicalAid.create({ data }); });
    await db.activityLog.create({ data: { userId: session.id, action: id ? "PATIENT_MEDICAL_AID_UPDATED" : "PATIENT_MEDICAL_AID_ADDED", entityType: "PatientMedicalAid", entityId: membership.id, summary: "Patient medical-aid details saved" } }); return NextResponse.json(membership);
  }
  if (body.entity === "CONSENT") {
    const session = await requirePermission("MANAGE_CONSENTS"); if (!session) return NextResponse.json({ error: "You do not have permission to capture consent." }, { status: 403 });
    const parsed = consentSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the consent details." }, { status: 400 });
    const { entity: _, ...data } = parsed.data; const consent = await db.medicalAidConsent.create({ data: { ...data, capturedByUserId: session.id } });
    await db.activityLog.create({ data: { userId: session.id, action: data.consentStatus === "WITHDRAWN" ? "MEDICAL_AID_CONSENT_WITHDRAWN" : "MEDICAL_AID_CONSENT_CAPTURED", entityType: "MedicalAidConsent", entityId: consent.id, summary: `ICD-10 disclosure consent recorded as ${data.consentStatus.toLowerCase()}` } }); return NextResponse.json(consent);
  }
  return NextResponse.json({ error: "Unsupported medical-aid action." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const session = await requirePermission("MANAGE_MEDICAL_AID_SETTINGS");
  if (!session) return NextResponse.json({ error: "You do not have permission to delete medical-aid configuration." }, { status: 403 });
  const parsed = z.object({ entity: z.enum(["FUND", "PROCEDURE"]), id: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a medical-aid item to delete." }, { status: 400 });
  try {
    if (parsed.data.entity === "FUND") {
      const fund = await db.medicalAid.findUnique({ where: { id: parsed.data.id }, include: { memberships: { select: { id: true } }, claims: { select: { id: true } }, batches: { select: { id: true } } } });
      if (!fund) return NextResponse.json({ error: "Medical-aid fund not found." }, { status: 404 });
      const references = fund.memberships.length + fund.claims.length + fund.batches.length;
      if (references) return NextResponse.json({ error: `This fund cannot be deleted because ${references} record${references === 1 ? " is" : "s are"} still referencing it. Disable it instead.` }, { status: 409 });
      await db.$transaction(async (tx) => { await tx.medicalAid.delete({ where: { id: fund.id } }); await tx.activityLog.create({ data: { userId: session.id, action: "MEDICAL_AID_FUND_DELETED", entityType: "MedicalAid", entityId: fund.id, summary: `${fund.name} fund deleted`, beforeJson: JSON.stringify(fund) } }); });
      return NextResponse.json({ ok: true });
    }
    const procedure = await db.medicalAidProcedureItem.findUnique({ where: { id: parsed.data.id }, include: { claimLines: { select: { id: true } } } });
    if (!procedure) return NextResponse.json({ error: "Procedure item not found." }, { status: 404 });
    if (procedure.claimLines.length) return NextResponse.json({ error: "This procedure is referenced by claims. Disable it instead." }, { status: 409 });
    await db.$transaction(async (tx) => { await tx.medicalAidProcedureItem.delete({ where: { id: procedure.id } }); await tx.activityLog.create({ data: { userId: session.id, action: "PROCEDURE_ITEM_DELETED", entityType: "MedicalAidProcedureItem", entityId: procedure.id, summary: `${procedure.code} procedure deleted`, beforeJson: JSON.stringify(procedure) } }); });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "The medical-aid item could not be deleted." }, { status: 500 }); }
}
