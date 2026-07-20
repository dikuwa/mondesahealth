import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";
import { canBeSickNoteDoctor, dateFromInput, defaultCertificateWording, nextCertificateNumber, sickNoteActionSchema, sickNoteInputSchema, verificationToken } from "@/lib/sick-notes";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const session = await requireSickNoteManager();
  if (!session) return NextResponse.json({ error: "You do not have permission to edit sick notes." }, { status: 403 });
  const { id } = await params;
  const parsed = sickNoteInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the sick-note details." }, { status: 400 });
  const input = parsed.data;
  try {
    const updated = await db.$transaction(async (tx) => {
      const [current, patient, doctor, appointment] = await Promise.all([
        tx.sickNote.findUnique({ where: { id } }),
        tx.patient.findUnique({ where: { id: input.patientId }, select: { id: true, archivedAt: true } }),
        tx.user.findUnique({ where: { id: input.doctorUserId }, select: { id: true, role: true, active: true } }),
        input.appointmentId ? tx.appointment.findUnique({ where: { id: input.appointmentId }, select: { id: true, patientId: true } }) : null,
      ]);
      if (!current) throw new Error("NOT_FOUND");
      if (current.status !== "DRAFT") throw new Error("IMMUTABLE");
      if (!patient || patient.archivedAt) throw new Error("PATIENT");
      if (!doctor || !canBeSickNoteDoctor(doctor)) throw new Error("DOCTOR");
      if (input.appointmentId && (!appointment || appointment.patientId !== patient.id)) throw new Error("APPOINTMENT");
      const note = await tx.sickNote.update({ where: { id }, data: {
        patientId: patient.id, appointmentId: appointment?.id || null, doctorUserId: doctor.id, purpose: input.purpose,
        consultationDate: dateFromInput(input.consultationDate), consultationTime: input.consultationTime || null,
        leaveFrom: dateFromInput(input.leaveFrom), leaveTo: dateFromInput(input.leaveTo), returnDate: dateFromInput(input.returnDate),
        fitnessStatus: input.fitnessStatus, restrictions: input.restrictions || null, diagnosisDisclosure: input.diagnosisDisclosure,
        diagnosisPlainText: input.diagnosisDisclosure === "CONSENTED" ? input.diagnosisPlainText || null : null,
        doctorNotes: input.doctorNotes, certificateWording: input.certificateWording || defaultCertificateWording(input), aiDraftUsed: input.aiDraftUsed,
        updatedById: session.id,
      } });
      await tx.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_EDITED", entityType: "SickNote", entityId: id, summary: `Draft ${note.certificateNumber} updated` } });
      return note;
    });
    return NextResponse.json({ id: updated.id, certificateNumber: updated.certificateNumber, status: updated.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = { NOT_FOUND: "Sick note not found.", IMMUTABLE: "Issued and revoked sick notes cannot be edited. Duplicate it to create a new draft.", PATIENT: "Choose an active patient.", DOCTOR: "Choose an active authorised doctor.", APPOINTMENT: "The appointment does not belong to this patient." };
    return NextResponse.json({ error: messages[code] || "The sick-note draft could not be updated." }, { status: code === "NOT_FOUND" ? 404 : code === "IMMUTABLE" ? 409 : code ? 400 : 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await requireSickNoteManager();
  if (!session) return NextResponse.json({ error: "You do not have permission to issue or revoke sick notes." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = sickNoteActionSchema.safeParse({ ...body, id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Choose a valid action." }, { status: 400 });
  try {
    if (parsed.data.action === "ISSUE") {
      const note = await db.$transaction(async (tx) => {
        const current = await tx.sickNote.findUnique({ where: { id }, include: { doctor: { select: { active: true, role: true } } } });
        if (!current) throw new Error("NOT_FOUND");
        if (current.status !== "DRAFT") throw new Error("NOT_DRAFT");
        if (!canBeSickNoteDoctor(current.doctor)) throw new Error("DOCTOR");
        if (current.doctorNotes.trim().length < 5) throw new Error("NOTES");
        if (current.certificateWording.trim().length < 10) throw new Error("WORDING");
        if (current.fitnessStatus === "FIT_WITH_RESTRICTIONS" && !current.restrictions?.trim()) throw new Error("RESTRICTIONS");
        if (current.diagnosisDisclosure !== "CONSENTED" && current.diagnosisPlainText) throw new Error("DISCLOSURE");
        const issued = await tx.sickNote.update({ where: { id }, data: { status: "ISSUED", issuedAt: new Date(), verificationToken: verificationToken(), updatedById: session.id } });
        await tx.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_ISSUED", entityType: "SickNote", entityId: id, summary: `${issued.certificateNumber} issued` } });
        return issued;
      });
      return NextResponse.json({ id: note.id, status: note.status });
    }
    if (parsed.data.action === "REVOKE") {
      const reason = parsed.data.reason;
      const note = await db.$transaction(async (tx) => {
        const current = await tx.sickNote.findUnique({ where: { id } });
        if (!current) throw new Error("NOT_FOUND");
        if (current.status !== "ISSUED") throw new Error("NOT_ISSUED");
        const revoked = await tx.sickNote.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date(), revokedReason: reason, updatedById: session.id } });
        await tx.generatedDocument.updateMany({ where: { sickNoteId: id, type: "SICK_NOTE_SHARE", status: "ISSUED" }, data: { status: "REVOKED" } });
        await tx.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_REVOKED", entityType: "SickNote", entityId: id, summary: `${revoked.certificateNumber} revoked: ${reason}` } });
        return revoked;
      });
      return NextResponse.json({ id: note.id, status: note.status });
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const duplicate = await db.$transaction(async (tx) => {
          const current = await tx.sickNote.findUnique({ where: { id } });
          if (!current) throw new Error("NOT_FOUND");
          const certificateNumber = await nextCertificateNumber(tx);
          const created = await tx.sickNote.create({ data: {
            certificateNumber, patientId: current.patientId, appointmentId: current.appointmentId, doctorUserId: current.doctorUserId,
            purpose: current.purpose, consultationDate: current.consultationDate, consultationTime: current.consultationTime,
            leaveFrom: current.leaveFrom, leaveTo: current.leaveTo, returnDate: current.returnDate, fitnessStatus: current.fitnessStatus,
            restrictions: current.restrictions, diagnosisDisclosure: current.diagnosisDisclosure, diagnosisPlainText: current.diagnosisPlainText,
            doctorNotes: current.doctorNotes, certificateWording: current.certificateWording, aiDraftUsed: false,
            createdById: session.id, updatedById: session.id,
          } });
          await tx.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_DUPLICATED", entityType: "SickNote", entityId: created.id, summary: `Draft ${created.certificateNumber} duplicated from ${current.certificateNumber}` } });
          return created;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return NextResponse.json({ id: duplicate.id, status: duplicate.status });
      } catch (error) {
        if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) continue;
        throw error;
      }
    }
    throw new Error("RETRY");
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = { NOT_FOUND: "Sick note not found.", NOT_DRAFT: "Only a draft can be issued.", NOT_ISSUED: "Only an issued sick note can be revoked.", DOCTOR: "The selected doctor is no longer authorised.", NOTES: "Add clinician notes before issuing.", WORDING: "Add certificate wording before issuing.", RESTRICTIONS: "Describe the restrictions before issuing.", DISCLOSURE: "Diagnosis disclosure is not valid." };
    return NextResponse.json({ error: messages[code] || "The sick-note action could not be completed." }, { status: code === "NOT_FOUND" ? 404 : ["NOT_DRAFT", "NOT_ISSUED"].includes(code) ? 409 : code ? 400 : 500 });
  }
}
