import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ref } from "@/lib/utils";
import { practiceWriteDenied } from "@/lib/practice-write-access";

const schema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  method: z.enum([
    "CASH",
    "CARD",
    "EFT",
    "MEDICAL_AID_PAYMENT",
    "EMPLOYER_PAYMENT",
    "OTHER",
  ]),
  payer: z.enum(["PATIENT", "MEDICAL_AID", "EMPLOYER", "OTHER"]),
  notes: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_FINANCE");
  if (!session)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const restricted = await practiceWriteDenied(session.practiceId);
  if (restricted) return restricted;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Payment details are invalid." },
      { status: 400 },
    );
  try {
    const result = await db.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({
          where: { id: parsed.data.invoiceId, practiceId: session.practiceId },
        });
        if (!invoice) throw new Error("NOT_FOUND");
        if (["PAID", "VOID"].includes(invoice.status))
          throw new Error("CLOSED");
        const outstanding = Math.max(
          0,
          invoice.total - invoice.patientPaid - invoice.medicalAidPaid,
        );
        if (parsed.data.amount > outstanding + 0.001)
          throw new Error("OVERPAYMENT");
        const payment = await tx.payment.create({
          data: {
            practiceId: session.practiceId,
            reference: ref("PAY"),
            invoiceId: invoice.id,
            patientId: invoice.patientId,
            userId: session.id,
            amount: parsed.data.amount,
            method: parsed.data.method,
            payer: parsed.data.payer,
            notes: parsed.data.notes,
          },
        });
        const receipt = await tx.receipt.create({
          data: { number: ref("REC"), paymentId: payment.id },
        });
        const patient =
          parsed.data.payer === "MEDICAL_AID" ? 0 : parsed.data.amount;
        const aid =
          parsed.data.payer === "MEDICAL_AID" ? parsed.data.amount : 0;
        const paidAfter =
          invoice.patientPaid + invoice.medicalAidPaid + parsed.data.amount;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            patientPaid: { increment: patient },
            medicalAidPaid: { increment: aid },
            status:
              paidAfter >= invoice.total - 0.001 ? "PAID" : "PARTIALLY_PAID",
          },
        });
        await tx.activityLog.create({
          data: {
            practiceId: session.practiceId,
            userId: session.id,
            action: "PAYMENT_RECORDED",
            entityType: "Payment",
            entityId: payment.id,
            summary: `Payment ${payment.reference} recorded and receipt ${receipt.number} issued`,
          },
        });
        return { payment, receipt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND")
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    if (error instanceof Error && error.message === "CLOSED")
      return NextResponse.json(
        {
          error: "Payments cannot be recorded against a paid or void invoice.",
        },
        { status: 409 },
      );
    if (error instanceof Error && error.message === "OVERPAYMENT")
      return NextResponse.json(
        { error: "Payment exceeds the current outstanding balance." },
        { status: 409 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return NextResponse.json(
        {
          error:
            "The balance changed while this payment was being recorded. Refresh and try again.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Could not record payment." },
      { status: 500 },
    );
  }
}
