import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, ref, validNamibianPhone } from "@/lib/utils";

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
});

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
    whatsapp: normalizePhone(input.phone),
    email: input.email || null,
    preferredMethod: input.preferredMethod,
  };
  const patient = await db.$transaction(async (tx) => {
    const saved = editing
      ? await tx.patient.update({ where: { id: input.id! }, data: base })
      : await tx.patient.create({
          data: { patientNumber: ref("PAT"), ...base },
        });
    await tx.patientMedicalAid.updateMany({
      where: { patientId: saved.id, current: true },
      data: { current: false, expiryDate: new Date() },
    });
    if (input.medicalAidId)
      await tx.patientMedicalAid.create({
        data: {
          patientId: saved.id,
          medicalAidId: input.medicalAidId,
          membershipNumber: input.membershipNumber || null,
          current: true,
        },
      });
    await tx.activityLog.create({
      data: {
        userId: session.id,
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
    where: { id, archivedAt: null },
  });
  if (!patient)
    return NextResponse.json(
      { error: "Patient record not found." },
      { status: 404 },
    );
  await db.$transaction([
    db.patient.update({ where: { id }, data: { archivedAt: new Date() } }),
    db.activityLog.create({
      data: {
        userId: session.id,
        action: "PATIENT_ARCHIVED",
        entityType: "Patient",
        entityId: id,
        summary: `Archived patient ${patient.fullName}; linked clinical and financial records retained`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
