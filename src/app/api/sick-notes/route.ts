import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";
import {
  canBeSickNoteDoctor,
  dateFromInput,
  defaultCertificateWording,
  nextCertificateNumber,
  sickNoteInputSchema,
} from "@/lib/sick-notes";
import { subscriptionAccess } from "@/lib/subscription-access";

function errorMessage(error: unknown) {
  if (
    error instanceof Error &&
    ["PATIENT", "DOCTOR", "APPOINTMENT"].includes(error.message)
  ) {
    return error.message === "PATIENT"
      ? "Choose an active patient."
      : error.message === "DOCTOR"
        ? "Choose an active authorised doctor."
        : "The appointment does not belong to this patient.";
  }
  return "The sick-note draft could not be saved.";
}

export async function POST(request: Request) {
  const session = await requireSickNoteManager();
  if (!session)
    return NextResponse.json(
      {
        error:
          "Only an authorised owner, administrator, or doctor can create sick notes.",
      },
      { status: 403 },
    );
  const subscription = await subscriptionAccess(session.practiceId);
  if (!subscription.allowed) return NextResponse.json({ error: subscription.warning, code: "SUBSCRIPTION_RESTRICTED" }, { status: 402 });
  const parsed = sickNoteInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the sick-note details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const note = await db.$transaction(
          async (tx) => {
            const [patient, doctor, appointment] = await Promise.all([
              tx.patient.findFirst({
                where: { id: input.patientId, practiceId: session.practiceId },
                select: { id: true, archivedAt: true },
              }),
              tx.user.findFirst({
                where: { id: input.doctorUserId, practiceId: session.practiceId },
                select: { id: true, role: true, active: true },
              }),
              input.appointmentId
                ? tx.appointment.findFirst({
                    where: { id: input.appointmentId, practiceId: session.practiceId },
                    select: { id: true, patientId: true },
                  })
                : null,
            ]);
            if (!patient || patient.archivedAt) throw new Error("PATIENT");
            if (!doctor || !canBeSickNoteDoctor(doctor))
              throw new Error("DOCTOR");
            if (
              input.appointmentId &&
              (!appointment || appointment.patientId !== patient.id)
            )
              throw new Error("APPOINTMENT");
            const certificateNumber = await nextCertificateNumber(
              tx,
              new Date().getFullYear(),
            );
            const certificateWording =
              input.certificateWording || defaultCertificateWording(input);
            const created = await tx.sickNote.create({
              data: {
                practiceId: session.practiceId,
                certificateNumber,
                patientId: patient.id,
                appointmentId: appointment?.id || null,
                doctorUserId: doctor.id,
                purpose: input.purpose,
                consultationDate: dateFromInput(input.consultationDate),
                consultationTime: input.consultationTime || null,
                leaveFrom: dateFromInput(input.leaveFrom),
                leaveTo: dateFromInput(input.leaveTo),
                returnDate: dateFromInput(input.returnDate),
                fitnessStatus: input.fitnessStatus,
                restrictions: input.restrictions || null,
                diagnosisDisclosure: input.diagnosisDisclosure,
                diagnosisPlainText:
                  input.diagnosisDisclosure === "CONSENTED"
                    ? input.diagnosisPlainText || null
                    : null,
                doctorNotes: input.doctorNotes,
                certificateWording,
                aiDraftUsed: input.aiDraftUsed,
                createdById: session.id,
                updatedById: session.id,
              },
            });
            await tx.activityLog.create({
              data: {
                practiceId: session.practiceId,
                userId: session.id,
                action: "SICK_NOTE_CREATED",
                entityType: "SickNote",
                entityId: created.id,
                summary: `Draft ${created.certificateNumber} created`,
              },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return NextResponse.json(
          {
            id: note.id,
            certificateNumber: note.certificateNumber,
            status: note.status,
          },
          { status: 201 },
        );
      } catch (error) {
        if (
          attempt < 2 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2002", "P2034"].includes(error.code)
        )
          continue;
        throw error;
      }
    }
    throw new Error("RETRY");
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) },
      {
        status:
          error instanceof Error &&
          ["PATIENT", "DOCTOR", "APPOINTMENT"].includes(error.message)
            ? 400
            : 500,
      },
    );
  }
}
