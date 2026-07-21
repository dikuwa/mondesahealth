import type { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

export type PatientMatchInput = {
  identityNumber?: string | null;
  passportNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  dateOfBirth?: Date | null;
};

export function normalizeIdentity(value?: string | null) {
  return value?.replace(/[\s-]/g, "").toUpperCase() || "";
}

export function normalizePatientName(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") || "";
}

export function patientMatchWhere(practiceId: string, input: PatientMatchInput): Prisma.PatientWhereInput {
  const identity = normalizeIdentity(input.identityNumber);
  const passport = normalizeIdentity(input.passportNumber);
  const phone = input.phone ? normalizePhone(input.phone) : "";
  const email = input.email?.trim().toLowerCase() || "";
  const name = input.fullName?.trim() || "";
  const exact: Prisma.PatientWhereInput[] = [];
  if (identity) exact.push({ identityNumber: { equals: identity, mode: "insensitive" } });
  if (passport) exact.push({ passportNumber: { equals: passport, mode: "insensitive" } });
  if (phone) exact.push({ normalizedPhone: phone });
  if (email) exact.push({ email: { equals: email, mode: "insensitive" } });
  if (name && input.dateOfBirth) exact.push({ fullName: { equals: name, mode: "insensitive" }, dateOfBirth: input.dateOfBirth });
  return { practiceId, archivedAt: null, OR: exact.length ? exact : [{ id: "__no_match__" }] };
}

export function maskIdentifier(value?: string | null) {
  if (!value) return null;
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function maskPhone(value?: string | null) {
  if (!value) return null;
  return `${value.slice(0, 4)} ••• •${value.slice(-2)}`;
}

export function missingPatientFields(patient: { dateOfBirth: Date | null; sex: string | null; phone: string; identificationType: string | null; identityNumber: string | null; passportNumber: string | null; emergencyName: string | null; emergencyPhone: string | null }) {
  const missing: string[] = [];
  if (!patient.dateOfBirth) missing.push("date of birth");
  if (!patient.sex) missing.push("sex");
  if (!patient.phone) missing.push("phone number");
  if (!patient.identificationType || (!patient.identityNumber && !patient.passportNumber)) missing.push("identification");
  if (!patient.emergencyName || !patient.emergencyPhone) missing.push("emergency contact");
  return missing;
}
