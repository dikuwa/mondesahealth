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

const count = async (practiceId: string) => {
  const [
    patients,
    appointments,
    invoices,
    payments,
    claims,
    batches,
    attachments,
    sickNotes,
    activity,
    reminders,
    receipts,
    documents,
    storage,
  ] = await Promise.all([
    db.patient.count({ where: { practiceId } }),
    db.appointment.count({ where: { practiceId } }),
    db.invoice.count({ where: { practiceId } }),
    db.payment.count({ where: { practiceId } }),
    db.claim.count({ where: { practiceId } }),
    db.claimBatch.count({ where: { practiceId } }),
    db.claimAttachment.count({ where: { practiceId } }),
    db.sickNote.count({ where: { practiceId } }),
    db.activityLog.count({ where: { practiceId } }),
    db.appointmentReminder.count({ where: { appointment: { practiceId } } }),
    db.receipt.count({ where: { payment: { practiceId } } }),
    db.generatedDocument.count({ where: { practiceId } }),
    db.claimAttachment.aggregate({
      where: { practiceId },
      _sum: { fileSize: true },
    }),
  ]);
  return {
    patients,
    appointments,
    invoices,
    payments,
    claims,
    batches,
    attachments,
    sickNotes,
    activity,
    reminders,
    receipts,
    documents,
    attachmentBytes: storage._sum.fileSize || 0,
  };
};

export async function GET() {
  const session = await requireOwner();
  if (!session)
    return NextResponse.json(
      { error: "Only the practice owner can preview a reset." },
      { status: 403 },
    );
  return NextResponse.json({
    ok: true,
    counts: await count(session.practiceId),
  });
}

export async function POST(request: Request) {
  const session = await requireOwner();
  if (!session)
    return NextResponse.json(
      { error: "Only the practice owner can reset the practice." },
      { status: 403 },
    );
  const parsed = z
    .object({ confirmation: z.literal(CONFIRMATION) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: `Type ${CONFIRMATION} to confirm this irreversible reset.` },
      { status: 400 },
    );

  try {
    await db.$transaction(
      async (tx) => {
        // Explicit dependency order keeps this safe even if a production database has
        // older migrations whose foreign keys do not cascade.
        const practiceId = session.practiceId;
        await tx.claimAttachment.deleteMany({ where: { practiceId } });
        await tx.claimStatusEvent.deleteMany({
          where: { claim: { practiceId } },
        });
        await tx.claimLineIcd10Code.deleteMany({
          where: { claimLine: { claim: { practiceId } } },
        });
        await tx.claimBatchItem.deleteMany({
          where: { claim: { practiceId } },
        });
        await tx.claimBatch.deleteMany({ where: { practiceId } });
        await tx.claimLine.deleteMany({ where: { claim: { practiceId } } });
        await tx.claim.deleteMany({ where: { practiceId } });

        await tx.generatedDocument.deleteMany({ where: { practiceId } });
        await tx.receipt.deleteMany({ where: { payment: { practiceId } } });
        await tx.payment.deleteMany({ where: { practiceId } });
        await tx.invoiceLine.deleteMany({ where: { invoice: { practiceId } } });
        await tx.invoice.deleteMany({ where: { practiceId } });

        await tx.appointmentChangeRequest.deleteMany({
          where: { appointment: { practiceId } },
        });
        await tx.appointmentReminder.deleteMany({
          where: { appointment: { practiceId } },
        });
        await tx.clinicalAiDraft.deleteMany({
          where: { intake: { practiceId } },
        });
        await tx.patientIntakeImage.deleteMany({
          where: { intake: { practiceId } },
        });
        await tx.patientIntakeMessage.deleteMany({
          where: { intake: { practiceId } },
        });
        await tx.patientIntake.deleteMany({ where: { practiceId } });
        await tx.secureLink.deleteMany({
          where: { appointment: { practiceId } },
        });
        await tx.medicalAidConsent.deleteMany({ where: { practiceId } });
        await tx.patientMedicalAid.deleteMany({ where: { practiceId } });
        await tx.sickNote.deleteMany({ where: { practiceId } });
        await tx.clinicalEncounter.deleteMany({ where: { practiceId } });
        await tx.appointment.deleteMany({ where: { practiceId } });
        await tx.patient.deleteMany({ where: { practiceId } });
        await tx.blockedTime.deleteMany({ where: { practiceId } });
        await tx.supportAccessGrant.deleteMany({ where: { practiceId } });
        await tx.notification.deleteMany({ where: { practiceId } });

        // Remove dashboard-authored homepage content; the public loader falls back
        // to its safe defaults until the owner publishes new copy.
        await tx.practiceContent.deleteMany({ where: { practiceId } });

        await tx.practiceSetting.upsert({
          where: { practiceId },
          update: {
            practiceName: "Mondesa Health Polyclinic",
            doctorName: "Dr Helena Ndeitunga",
            practiceNumber: "Pending configuration",
            registrationNumber: "Pending configuration",
            phone: "+264 81 000 0000",
            whatsapp: "+264 81 000 0000",
            email: "hello@mondesahealth.na",
            address: "Mondesa, Swakopmund, Namibia",
            bookingMode: "AVAILABLE_TIME",
            minNoticeHours: 2,
            maxAdvanceDays: 60,
            cancellationPolicy:
              "Please give at least 4 hours' notice when possible.",
            currency: "NAD",
            signatureName: "Dr Helena Ndeitunga",
            signatureTitle: "Medical Practitioner",
            vatEnabled: false,
            tagline: "Your Health. Your Choice. Your Community.",
            publicDescription:
              "Mondesa Health Polyclinic brings multiple healthcare disciplines together in one trusted community healthcare destination.",
            locationNote: "",
            mapsUrl: "",
            mapLatitude: null,
            mapLongitude: null,
            publicHours: null,
            showEmail: false,
            showWhatsapp: false,
            claimContactName: "",
            claimPhone: "",
            claimEmail: "",
            claimPostalAddress: "",
            reminderEnabled: true,
            reminderLeadHours: 24,
          },
          create: {
            id: `practice-${practiceId}`,
            practiceId,
            practiceName: "Mondesa Health Polyclinic",
            doctorName: "Dr Helena Ndeitunga",
            practiceNumber: "Pending configuration",
            registrationNumber: "Pending configuration",
            phone: "+264 81 000 0000",
            whatsapp: "+264 81 000 0000",
            email: "hello@mondesahealth.na",
            address: "Mondesa, Swakopmund, Namibia",
            bookingMode: "AVAILABLE_TIME",
            minNoticeHours: 2,
            maxAdvanceDays: 60,
            cancellationPolicy:
              "Please give at least 4 hours' notice when possible.",
            currency: "NAD",
            signatureName: "Dr Helena Ndeitunga",
            signatureTitle: "Medical Practitioner",
            vatEnabled: false,
            tagline: "Your Health. Your Choice. Your Community.",
            publicDescription:
              "Mondesa Health Polyclinic brings multiple healthcare disciplines together in one trusted community healthcare destination.",
            locationNote: "",
            mapsUrl: "",
            showEmail: false,
            showWhatsapp: false,
            claimContactName: "",
            claimPhone: "",
            claimEmail: "",
            claimPostalAddress: "",
          },
        });

        await tx.activityLog.deleteMany({ where: { practiceId } });
      },
      { timeout: 120_000, maxWait: 15_000 },
    );
    return NextResponse.json({
      ok: true,
      counts: await count(session.practiceId),
    });
  } catch (error) {
    console.error("Practice reset failed", error);
    return NextResponse.json(
      { error: "The reset could not be completed. No changes were committed." },
      { status: 500 },
    );
  }
}
