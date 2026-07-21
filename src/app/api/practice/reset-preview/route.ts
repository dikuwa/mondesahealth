import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session || session.role !== "OWNER")
    return NextResponse.json(
      { error: "Only the practice owner can preview a reset." },
      { status: 403 },
    );
  const practiceId = session.practiceId;
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
  return NextResponse.json({
    ok: true,
    counts: {
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
    },
  });
}
