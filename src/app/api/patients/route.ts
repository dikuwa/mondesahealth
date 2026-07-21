import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, ref, validNamibianPhone } from "@/lib/utils";
import { maskIdentifier, maskPhone, patientMatchWhere } from "@/lib/patient-matching";

const emptyForNull = (value: unknown) => (value == null ? "" : value);
const schema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(3).max(120),
  dateOfBirth: z.preprocess(emptyForNull, z.string()),
  gender: z.preprocess(emptyForNull, z.string()),
  phone: z
    .string()
    .refine(validNamibianPhone, "Enter a valid Namibian phone number."),
  email: z.preprocess(
    emptyForNull,
    z.union([z.literal(""), z.string().email()]),
  ),
  preferredMethod: z.enum(["WHATSAPP", "SMS", "EMAIL", "PHONE"]),
  medicalAidId: z.preprocess(emptyForNull, z.string()),
  membershipNumber: z.preprocess(emptyForNull, z.string().max(60)),
  firstName: z.preprocess(emptyForNull, z.string().trim().max(80)).optional(),
  middleName: z.preprocess(emptyForNull, z.string().trim().max(80)).optional(),
  lastName: z.preprocess(emptyForNull, z.string().trim().max(80)).optional(),
  identificationType: z.preprocess(emptyForNull, z.string().max(40)).optional(),
  identityNumber: z.preprocess(emptyForNull, z.string().trim().max(40)).optional(),
  passportNumber: z.preprocess(emptyForNull, z.string().trim().max(40)).optional(),
  whatsapp: z.preprocess(emptyForNull, z.string().max(30)).optional(),
  address: z.preprocess(emptyForNull, z.string().max(300)).optional(),
  town: z.preprocess(emptyForNull, z.string().max(100)).optional(),
  region: z.preprocess(emptyForNull, z.string().max(100)).optional(),
  emergencyName: z.preprocess(emptyForNull, z.string().max(120)).optional(),
  emergencyRelation: z.preprocess(emptyForNull, z.string().max(80)).optional(),
  emergencyPhone: z.preprocess(emptyForNull, z.string().max(30)).optional(),
  knownAllergies: z.preprocess(emptyForNull, z.string().max(2000)).optional(),
  chronicConditions: z.preprocess(emptyForNull, z.string().max(3000)).optional(),
  currentMedication: z.preprocess(emptyForNull, z.string().max(3000)).optional(),
  previousProcedures: z.preprocess(emptyForNull, z.string().max(3000)).optional(),
  medicalAlerts: z.preprocess(emptyForNull, z.string().max(2000)).optional(),
  medicalHistorySummary: z.preprocess(emptyForNull, z.string().max(4000)).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DECEASED"]).optional(),
});

export async function GET(request: Request) {
  const session = await requirePermission("MANAGE_PATIENTS");
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const url = new URL(request.url);
  if (url.searchParams.get("mode") !== "match") return NextResponse.json({ error: "Unsupported query." }, { status: 400 });
  const dob = url.searchParams.get("dateOfBirth");
  const matches = await db.patient.findMany({
    where: patientMatchWhere(session.practiceId, { identityNumber: url.searchParams.get("identityNumber"), passportNumber: url.searchParams.get("passportNumber"), phone: url.searchParams.get("phone"), email: url.searchParams.get("email"), fullName: url.searchParams.get("fullName"), dateOfBirth: dob ? new Date(`${dob}T00:00:00.000Z`) : null }),
    select: { id: true, fullName: true, dateOfBirth: true, identityNumber: true, passportNumber: true, phone: true, appointments: { where: { practiceId: session.practiceId }, select: { startAt: true }, orderBy: { startAt: "desc" }, take: 1 } },
    take: 8,
  });
  return NextResponse.json({ matches: matches.map((item) => ({ id: item.id, fullName: item.fullName, dateOfBirth: item.dateOfBirth, maskedId: maskIdentifier(item.identityNumber || item.passportNumber), maskedPhone: maskPhone(item.phone), lastVisit: item.appointments[0]?.startAt || null })) });
}

async function mutate(request: Request, editing: boolean) {
  const session = await requirePermission("MANAGE_PATIENTS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to manage patients." },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check the patient details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (editing && !input.id)
    return NextResponse.json(
      { error: "Patient record not found." },
      { status: 400 },
    );
  const base = {
    fullName: input.fullName,
    surname: input.fullName.split(" ").pop() || "",
    initials: input.fullName
      .split(" ")
      .map((x) => x[0])
      .join("")
      .slice(0, 4),
    dateOfBirth: input.dateOfBirth
      ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
      : null,
    gender: input.gender || null,
    phone: normalizePhone(input.phone),
    email: input.email || null,
    preferredMethod: input.preferredMethod,
    firstName: input.firstName || null,
    middleName: input.middleName || null,
    lastName: input.lastName || input.fullName.split(" ").pop() || null,
    sex: input.gender || null,
    identificationType: input.identificationType || null,
    identityNumber: input.identityNumber || null,
    passportNumber: input.passportNumber || null,
    normalizedPhone: normalizePhone(input.phone),
    whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : normalizePhone(input.phone),
    address: input.address || null,
    town: input.town || null,
    region: input.region || null,
    emergencyName: input.emergencyName || null,
    emergencyRelation: input.emergencyRelation || null,
    emergencyPhone: input.emergencyPhone ? normalizePhone(input.emergencyPhone) : null,
    knownAllergies: input.knownAllergies || null,
    chronicConditions: input.chronicConditions || null,
    currentMedication: input.currentMedication || null,
    previousProcedures: input.previousProcedures || null,
    medicalAlerts: input.medicalAlerts || null,
    medicalHistorySummary: input.medicalHistorySummary || null,
    status: input.status || "ACTIVE",
    updatedById: session.id,
  };
  const patient = await db.$transaction(async (tx) => {
    const saved = editing
      ? await tx.patient.update({ where: { id: input.id!, practiceId: session.practiceId }, data: base })
      : await tx.patient.create({
          data: { patientNumber: ref("PAT"), practiceId: session.practiceId, createdById: session.id, ...base },
        });
    await tx.patientMedicalAid.updateMany({
      where: { patientId: saved.id, practiceId: session.practiceId, current: true },
      data: { current: false, expiryDate: new Date() },
    });
    if (input.medicalAidId)
      await tx.patientMedicalAid.create({
        data: {
          patientId: saved.id,
          practiceId: session.practiceId,
          medicalAidId: input.medicalAidId,
          membershipNumber: input.membershipNumber || null,
          current: true,
        },
      });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: editing ? "PATIENT_UPDATED" : "PATIENT_CREATED",
        entityType: "Patient",
        entityId: saved.id,
        summary: `${editing ? "Updated" : "Created"} patient ${saved.fullName}`,
      },
    });
    return saved;
  });
  return NextResponse.json({ id: patient.id }, { status: editing ? 200 : 201 });
}
export function POST(request: Request) {
  return mutate(request, false);
}
export function PATCH(request: Request) {
  return mutate(request, true);
}
export async function DELETE(request: Request) {
  const session = await requirePermission("MANAGE_PATIENTS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to archive patients." },
      { status: 403 },
    );
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Patient record not found." },
      { status: 400 },
    );
  const patient = await db.patient.findFirst({
    where: { id, practiceId: session.practiceId, archivedAt: null },
  });
  if (!patient)
    return NextResponse.json(
      { error: "Patient record not found." },
      { status: 404 },
    );
  await db.$transaction([
    db.patient.update({ where: { id, practiceId: session.practiceId }, data: { archivedAt: new Date(), updatedById: session.id } }),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "PATIENT_ARCHIVED",
        entityType: "Patient",
        entityId: id,
        summary: `Archived patient ${patient.fullName}; linked clinical and financial records retained`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
