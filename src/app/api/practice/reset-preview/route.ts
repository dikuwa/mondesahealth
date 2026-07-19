import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Only the practice owner can preview a reset." }, { status: 403 });
  const providerDepartments = await db.provider.findMany({ select: { departmentId: true }, distinct: ["departmentId"] });
  const preservedDepartmentIds = providerDepartments.map(({ departmentId }) => departmentId);
  const providerlessDepartmentWhere = preservedDepartmentIds.length ? { id: { notIn: preservedDepartmentIds } } : undefined;
  const providerlessServiceWhere = preservedDepartmentIds.length ? { departmentId: { notIn: preservedDepartmentIds } } : undefined;
  const [patients, appointments, invoices, payments, claims, batches, attachments, departments, services, providers, providerlessDepartments, providerlessServices, activity, reminders, receipts, documents, storage] = await Promise.all([
    db.patient.count(), db.appointment.count(), db.invoice.count(), db.payment.count(), db.claim.count(), db.claimBatch.count(), db.claimAttachment.count(),
    db.department.count(), db.departmentService.count(), db.provider.count(), db.department.count({ where: providerlessDepartmentWhere }), db.departmentService.count({ where: providerlessServiceWhere }), db.activityLog.count(),
    db.appointmentReminder.count(),db.receipt.count(),db.generatedDocument.count(),db.claimAttachment.aggregate({_sum:{fileSize:true}}),
  ]);
  return NextResponse.json({ ok: true, counts: { patients, appointments, invoices, payments, claims, batches, attachments, departments, services, providers, providersPreserved: providers, directoryRecordsToRemove: providerlessDepartments + providerlessServices, activity, reminders, receipts, documents, attachmentBytes:storage._sum.fileSize||0 } });
}
