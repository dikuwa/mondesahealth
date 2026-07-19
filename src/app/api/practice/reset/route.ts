import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const CONFIRMATION = "RESET MONDESA";

async function requireOwner() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session || session.role !== "OWNER") return null;
  return session;
}

const count = async () => {
  const [patients, appointments, invoices, payments, claims, batches, attachments, activity, reminders, receipts, documents, storage] = await Promise.all([
    db.patient.count(), db.appointment.count(), db.invoice.count(), db.payment.count(), db.claim.count(), db.claimBatch.count(), db.claimAttachment.count(),
    db.activityLog.count(), db.appointmentReminder.count(),db.receipt.count(),db.generatedDocument.count(),db.claimAttachment.aggregate({_sum:{fileSize:true}}),
  ]);
  return { patients, appointments, invoices, payments, claims, batches, attachments, activity, reminders, receipts, documents, attachmentBytes:storage._sum.fileSize||0 };
};

export async function GET() {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Only the practice owner can preview a reset." }, { status: 403 });
  return NextResponse.json({ ok: true, counts: await count() });
}

export async function POST(request: Request) {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Only the practice owner can reset the practice." }, { status: 403 });
  const parsed = z.object({ confirmation: z.literal(CONFIRMATION) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `Type ${CONFIRMATION} to confirm this irreversible reset.` }, { status: 400 });

  try {
    await db.$transaction(async (tx) => {
      // Explicit dependency order keeps this safe even if a production database has
      // older migrations whose foreign keys do not cascade.
      await tx.claimAttachment.deleteMany();
      await tx.claimStatusEvent.deleteMany();
      await tx.claimLineIcd10Code.deleteMany();
      await tx.claimBatchItem.deleteMany();
      await tx.claimBatch.deleteMany();
      await tx.claimLine.deleteMany();
      await tx.claim.deleteMany();

      await tx.generatedDocument.deleteMany();
      await tx.receipt.deleteMany();
      await tx.payment.deleteMany();
      await tx.invoiceLine.deleteMany();
      await tx.invoice.deleteMany();

      await tx.appointmentChangeRequest.deleteMany();
      await tx.appointmentReminder.deleteMany();
      await tx.clinicalAiDraft.deleteMany();
      await tx.patientIntakeImage.deleteMany();
      await tx.patientIntakeMessage.deleteMany();
      await tx.patientIntake.deleteMany();
      await tx.secureLink.deleteMany();
      await tx.medicalAidConsent.deleteMany();
      await tx.patientMedicalAid.deleteMany();
      await tx.appointment.deleteMany();
      await tx.patient.deleteMany();
      await tx.blockedTime.deleteMany();

      // Remove dashboard-authored homepage content; the public loader falls back
      // to its safe defaults until the owner publishes new copy.
      await tx.practiceContent.deleteMany();

      await tx.practiceSetting.upsert({
        where: { id: "practice" },
        update: {
          practiceName: "Mondesa Health Polyclinic", doctorName: "Dr Helena Ndeitunga", practiceNumber: "Pending configuration", registrationNumber: "Pending configuration",
          phone: "+264 81 000 0000", whatsapp: "+264 81 000 0000", email: "hello@mondesahealth.na", address: "Mondesa, Swakopmund, Namibia", bookingMode: "AVAILABLE_TIME", minNoticeHours: 2,
          maxAdvanceDays: 60, cancellationPolicy: "Please give at least 4 hours' notice when possible.", currency: "NAD", signatureName: "Dr Helena Ndeitunga", signatureTitle: "Medical Practitioner",
          vatEnabled: false, tagline: "Your Health. Your Choice. Your Community.", publicDescription: "Mondesa Health Polyclinic brings multiple healthcare disciplines together in one trusted community healthcare destination.", locationNote: "", mapsUrl: "", mapLatitude: null,
          mapLongitude: null, publicHours: null, showEmail: false, showWhatsapp: false, claimContactName: "",
          claimPhone: "", claimEmail: "", claimPostalAddress: "",
          reminderEnabled:true,reminderLeadHours:24,
        },
        create: { id: "practice", practiceName: "Mondesa Health Polyclinic", doctorName: "Dr Helena Ndeitunga", practiceNumber: "Pending configuration", registrationNumber: "Pending configuration", phone: "+264 81 000 0000", whatsapp: "+264 81 000 0000", email: "hello@mondesahealth.na", address: "Mondesa, Swakopmund, Namibia", bookingMode: "AVAILABLE_TIME", minNoticeHours: 2, maxAdvanceDays: 60, cancellationPolicy: "Please give at least 4 hours' notice when possible.", currency: "NAD", signatureName: "Dr Helena Ndeitunga", signatureTitle: "Medical Practitioner", vatEnabled: false, tagline: "Your Health. Your Choice. Your Community.", publicDescription: "Mondesa Health Polyclinic brings multiple healthcare disciplines together in one trusted community healthcare destination.", locationNote: "", mapsUrl: "", showEmail: false, showWhatsapp: false, claimContactName: "", claimPhone: "", claimEmail: "", claimPostalAddress: "" },
      });

      await tx.activityLog.deleteMany();
    }, { timeout: 120_000, maxWait: 15_000 });
    return NextResponse.json({ ok: true, counts: await count() });
  } catch (error) {
    console.error("Practice reset failed", error);
    return NextResponse.json({ error: "The reset could not be completed. No changes were committed." }, { status: 500 });
  }
}
