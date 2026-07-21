import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePermission("MANAGE_FINANCE");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to share invoices." },
      { status: 403 },
    );
  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: { id, practiceId: session.practiceId },
    include: { patient: true },
  });
  if (!invoice)
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const token = randomBytes(24).toString("base64url");
  const expiresAt = addDays(new Date(), 14);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  await db.$transaction(async (tx) => {
    await tx.generatedDocument.updateMany({
      where: {
        practiceId: session.practiceId,
        invoiceId: id,
        type: "INVOICE_SHARE",
        status: "ISSUED",
      },
      data: { status: "REVOKED" },
    });
    await tx.generatedDocument.create({
      data: {
        practiceId: session.practiceId,
        number: `SHARE-${invoice.number}-${Date.now()}`,
        type: "INVOICE_SHARE",
        invoiceId: id,
        secureToken: createHash("sha256").update(token).digest("hex"),
        expiresAt,
      },
    });
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: "INVOICE_SHARE_CREATED",
        entityType: "Invoice",
        entityId: id,
        summary: `Secure share link created for ${invoice.number}`,
      },
    });
  });
  const link = `${origin}/d/${token}`;
  const outstanding = Math.max(
    0,
    invoice.total - invoice.patientPaid - invoice.medicalAidPaid,
  );
  const message = `Hello ${invoice.patient.fullName.split(" ")[0]},\n\nPlease find your invoice ${invoice.number} from Mondesa Health Polyclinic.\n\nTotal: NAD ${invoice.total.toFixed(2)}\nOutstanding: NAD ${outstanding.toFixed(2)}\n\nView the document securely:\n${link}\n\nKind regards,\nMondesa Health Polyclinic`;
  return NextResponse.json({
    link,
    message,
    whatsapp: `https://wa.me/${(invoice.patient.whatsapp || invoice.patient.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
    email: invoice.patient.email
      ? `mailto:${encodeURIComponent(invoice.patient.email)}?subject=${encodeURIComponent(`Invoice ${invoice.number} · Mondesa Health`)}&body=${encodeURIComponent(message)}`
      : null,
  });
}
