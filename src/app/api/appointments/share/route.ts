import { createHash, randomBytes } from "crypto";
import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_APPOINTMENTS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to share appointment updates." },
      { status: 403 },
    );
  const parsed = z
    .object({
      id: z.string(),
      kind: z.enum(["CONFIRMATION", "RESCHEDULE", "CANCELLATION"]),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid communication request." },
      { status: 400 },
    );
  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.id },
    include: {
      patient: true,
      changeRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!appointment)
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 },
    );
  const token = randomBytes(16).toString("base64url");
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const link = `${origin}/a/${token}`;
  const first = appointment.patient.fullName.split(" ")[0];
  const messageDate =
    parsed.data.kind === "RESCHEDULE" &&
    appointment.changeRequests[0]?.proposedStartAt
      ? appointment.changeRequests[0].proposedStartAt
      : appointment.startAt;
  const when = messageDate
    ? format(messageDate, "EEEE, dd MMMM yyyy 'at' HH:mm")
    : "the date requested";
  const wording = {
    CONFIRMATION: `is confirmed for ${when}`,
    RESCHEDULE: `has a proposed or updated time of ${when}`,
    CANCELLATION: "has been cancelled",
  }[parsed.data.kind];
  const message = `Hello ${first}, your Mondesa Health appointment ${appointment.reference} ${wording}. Manage your appointment securely here: ${link}`;
  await db.$transaction([
    db.secureLink.updateMany({
      where: {
        appointmentId: appointment.id,
        purpose: "MANAGE_APPOINTMENT",
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    db.secureLink.create({
      data: {
        tokenHash: createHash("sha256").update(token).digest("hex"),
        appointmentId: appointment.id,
        purpose: "MANAGE_APPOINTMENT",
        expiresAt: addDays(new Date(), 60),
      },
    }),
    db.activityLog.create({
      data: {
        userId: session.id,
        action: "COMMUNICATION_DRAFT_OPENED",
        entityType: "Appointment",
        entityId: appointment.id,
        summary: `Opened ${parsed.data.kind.toLowerCase()} communication draft for ${appointment.reference}; delivery not asserted`,
      },
    }),
  ]);
  const whatsapp = appointment.patient.whatsapp
    ? `https://wa.me/${appointment.patient.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : null;
  const email = appointment.patient.email
    ? `mailto:${encodeURIComponent(appointment.patient.email)}?subject=${encodeURIComponent(`Mondesa Health appointment ${appointment.reference}`)}&body=${encodeURIComponent(message)}`
    : null;
  return NextResponse.json({
    message,
    link,
    whatsapp,
    email,
    patientId: appointment.patientId,
  });
}
