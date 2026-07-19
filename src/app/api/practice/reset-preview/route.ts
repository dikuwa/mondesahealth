import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Only the practice owner can preview a reset." }, { status: 403 });
  const [patients, appointments, invoices, payments, claims, batches, attachments, activity, reminders, receipts, documents, storage] = await Promise.all([
    db.patient.count(), db.appointment.count(), db.invoice.count(), db.payment.count(), db.claim.count(), db.claimBatch.count(), db.claimAttachment.count(),
    db.activityLog.count(), db.appointmentReminder.count(),db.receipt.count(),db.generatedDocument.count(),db.claimAttachment.aggregate({_sum:{fileSize:true}}),
  ]);
  return NextResponse.json({ ok: true, counts: { patients, appointments, invoices, payments, claims, batches, attachments, activity, reminders, receipts, documents, attachmentBytes:storage._sum.fileSize||0 } });
}
