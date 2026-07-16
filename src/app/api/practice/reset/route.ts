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
  const [patients, appointments, invoices, payments, claims, batches, attachments, departments, services, providers, activity] = await Promise.all([
    db.patient.count(), db.appointment.count(), db.invoice.count(), db.payment.count(), db.claim.count(), db.claimBatch.count(), db.claimAttachment.count(),
    db.department.count(), db.departmentService.count(), db.provider.count(), db.activityLog.count(),
  ]);
  return { patients, appointments, invoices, payments, claims, batches, attachments, departments, services, providers, activity, totalDirectory: departments + services + providers };
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

      await tx.receipt.deleteMany();
      await tx.payment.deleteMany();
      await tx.generatedDocument.deleteMany();
      await tx.invoiceLine.deleteMany();
      await tx.invoice.deleteMany();

      await tx.appointmentChangeRequest.deleteMany();
      await tx.secureLink.deleteMany();
      await tx.medicalAidConsent.deleteMany();
      await tx.patientMedicalAid.deleteMany();
      await tx.appointment.deleteMany();
      await tx.patient.deleteMany();
      await tx.blockedTime.deleteMany();

      await tx.provider.deleteMany();
      await tx.departmentService.deleteMany();
      await tx.department.deleteMany();

      await tx.practiceSetting.upsert({
        where: { id: "practice" },
        update: {
          practiceName: "Mondesa Health Polyclinic", doctorName: "", practiceNumber: "", registrationNumber: "",
          phone: "", whatsapp: "", email: "", address: "", bookingMode: "AVAILABLE_TIME", minNoticeHours: 2,
          maxAdvanceDays: 60, cancellationPolicy: "", currency: "NAD", signatureName: "", signatureTitle: "",
          vatEnabled: false, tagline: "", publicDescription: "", locationNote: "", mapsUrl: "", mapLatitude: null,
          mapLongitude: null, publicHours: null, showEmail: false, showWhatsapp: false, claimContactName: "",
          claimPhone: "", claimEmail: "", claimPostalAddress: "",
        },
        create: { id: "practice", practiceName: "Mondesa Health Polyclinic", doctorName: "", practiceNumber: "", registrationNumber: "", phone: "", whatsapp: "", email: "", address: "", bookingMode: "AVAILABLE_TIME", minNoticeHours: 2, maxAdvanceDays: 60, cancellationPolicy: "", currency: "NAD", signatureName: "", signatureTitle: "", vatEnabled: false, tagline: "", publicDescription: "", locationNote: "", mapsUrl: "", showEmail: false, showWhatsapp: false, claimContactName: "", claimPhone: "", claimEmail: "", claimPostalAddress: "" },
      });

      // Keep a minimal, protected booking shell so existing /book and /slots routes
      // continue to work. Staff can fill in its public content later.
      await tx.department.create({ data: {
        slug: "general-practice", name: "General Practitioner", categoryLabel: "Primary healthcare services",
        summary: "General Practice appointments", description: "General Practice booking is available.", status: "ACTIVE",
        public: true, bookingEnabled: true, sortOrder: 0,
      } });

      await tx.activityLog.deleteMany();
    });
    return NextResponse.json({ ok: true, counts: await count() });
  } catch (error) {
    console.error("Practice reset failed", error);
    return NextResponse.json({ error: "The reset could not be completed. No changes were committed." }, { status: 500 });
  }
}
