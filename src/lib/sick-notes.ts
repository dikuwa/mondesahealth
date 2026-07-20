import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const SICK_NOTE_PURPOSES = ["WORK", "SCHOOL", "OTHER"] as const;
export const SICK_NOTE_FITNESS = ["UNFIT_FOR_WORK", "UNFIT_FOR_SCHOOL", "FIT_WITH_RESTRICTIONS", "FIT_TO_RETURN"] as const;
export const SICK_NOTE_DISCLOSURES = ["CONSENTED", "NOT_DISCLOSED"] as const;
export const SICK_NOTE_STATUSES = ["DRAFT", "ISSUED", "REVOKED"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const sickNoteInputSchema = z.object({
  patientId: z.string().min(1, "Choose a patient."),
  appointmentId: optionalText(100),
  doctorUserId: z.string().min(1, "Choose an authorised doctor."),
  purpose: z.enum(SICK_NOTE_PURPOSES),
  consultationDate: isoDate,
  consultationTime: optionalText(10),
  leaveFrom: isoDate,
  leaveTo: isoDate,
  returnDate: isoDate,
  fitnessStatus: z.enum(SICK_NOTE_FITNESS),
  restrictions: optionalText(1200),
  diagnosisDisclosure: z.enum(SICK_NOTE_DISCLOSURES),
  diagnosisPlainText: optionalText(500),
  doctorNotes: optionalText(3000),
  certificateWording: optionalText(3000),
  aiDraftUsed: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.leaveTo < value.leaveFrom)
    context.addIssue({ code: "custom", path: ["leaveTo"], message: "Leave end date cannot be before the start date." });
  if (value.returnDate <= value.leaveTo)
    context.addIssue({ code: "custom", path: ["returnDate"], message: "Return date must be after the leave period." });
  if (value.diagnosisDisclosure === "NOT_DISCLOSED" && value.diagnosisPlainText)
    context.addIssue({ code: "custom", path: ["diagnosisPlainText"], message: "Diagnosis may only be included with recorded patient consent." });
});

export const sickNoteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ISSUE"), id: z.string().min(1) }),
  z.object({ action: z.literal("REVOKE"), id: z.string().min(1), reason: z.string().trim().min(5).max(600) }),
  z.object({ action: z.literal("DUPLICATE"), id: z.string().min(1) }),
]);

export function dateFromInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function canManageSickNotes(session: { role: string; permissions: string[] }) {
  return session.role === "OWNER" || session.permissions.includes("MANAGE_SICK_NOTES");
}

export function canBeSickNoteDoctor(user: { role: string; active: boolean }) {
  return user.active && ["OWNER", "ADMIN", "DOCTOR"].includes(user.role);
}

export async function nextCertificateNumber(tx: Prisma.TransactionClient, year = new Date().getFullYear()) {
  const prefix = `MH-SN-${year}-`;
  const latest = await tx.sickNote.findFirst({
    where: { certificateNumber: { startsWith: prefix } },
    orderBy: { certificateNumber: "desc" },
    select: { certificateNumber: true },
  });
  const sequence = latest ? Number(latest.certificateNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

export function verificationToken() {
  return randomBytes(32).toString("base64url");
}

export function maskedPatientName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Patient";
  if (parts.length === 1) return `${parts[0][0]}${"•".repeat(Math.max(1, parts[0].length - 1))}`;
  return `${parts[0][0]}. ${parts.at(-1)?.[0]}.`;
}

export function defaultCertificateWording(input: { purpose: string; fitnessStatus: string; leaveFrom: string; leaveTo: string; returnDate: string; restrictions?: string }) {
  const setting = input.purpose === "SCHOOL" ? "school" : input.purpose === "WORK" ? "work" : "their usual duties";
  if (input.fitnessStatus === "FIT_TO_RETURN")
    return `The patient was assessed and is medically fit to return to ${setting} on ${input.returnDate}.`;
  if (input.fitnessStatus === "FIT_WITH_RESTRICTIONS")
    return `The patient was assessed and may attend ${setting} with the following temporary restrictions: ${input.restrictions || "as discussed with the patient"}.`;
  return `The patient was assessed and is medically unfit to attend ${setting} from ${input.leaveFrom} to ${input.leaveTo}, inclusive. The anticipated return date is ${input.returnDate}.`;
}
