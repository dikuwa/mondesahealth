import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDueReminders } from "@/lib/reminders";

export async function GET() {
  const session = await requirePermission("MANAGE_APPOINTMENTS");
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json({ reminders: await getDueReminders() });
}

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_APPOINTMENTS");
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["PREPARE", "MARK_SENT", "DISMISS"]), appointmentId: z.string().optional(), id: z.string().optional() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid reminder action." }, { status: 400 });
  if (parsed.data.action === "PREPARE") {
    if (!parsed.data.appointmentId) return NextResponse.json({ error: "Appointment is required." }, { status: 400 });
    const appointment = await db.appointment.findFirst({ where: { id: parsed.data.appointmentId,practiceId:session.practiceId } });
    if (!appointment?.startAt || appointment.status !== "CONFIRMED" || appointment.startAt <= new Date()) return NextResponse.json({ error: "This appointment is no longer eligible for a reminder." }, { status: 409 });
    const reminder = await db.appointmentReminder.upsert({ where: { appointmentId_appointmentStartAt: { appointmentId: appointment.id, appointmentStartAt: appointment.startAt } }, create: { appointmentId: appointment.id, appointmentStartAt: appointment.startAt }, update: {} });
    await db.activityLog.create({ data: { userId: session.id, action: "REMINDER_PREPARED", entityType: "AppointmentReminder", entityId: reminder.id, summary: `Reminder prepared for ${appointment.reference}; delivery not asserted` } });
    return NextResponse.json(reminder);
  }
  if(parsed.data.action==="DISMISS"&&!parsed.data.id&&parsed.data.appointmentId){const appointment=await db.appointment.findUnique({where:{id:parsed.data.appointmentId}});if(!appointment?.startAt)return NextResponse.json({error:"Appointment not found."},{status:404});const reminder=await db.appointmentReminder.upsert({where:{appointmentId_appointmentStartAt:{appointmentId:appointment.id,appointmentStartAt:appointment.startAt}},create:{appointmentId:appointment.id,appointmentStartAt:appointment.startAt,status:"DISMISSED",actedByUserId:session.id,actedAt:new Date()},update:{status:"DISMISSED",actedByUserId:session.id,actedAt:new Date()}});await db.activityLog.create({data:{userId:session.id,action:"REMINDER_DISMISSED",entityType:"AppointmentReminder",entityId:reminder.id,summary:`Reminder for ${appointment.reference} dismissed`}});return NextResponse.json({ok:true})}
  if (!parsed.data.id) return NextResponse.json({ error: "Reminder is required." }, { status: 400 });
  const status = parsed.data.action === "MARK_SENT" ? "SENT" : "DISMISSED";
  const reminder = await db.appointmentReminder.findFirst({ where: { id: parsed.data.id,appointment:{practiceId:session.practiceId} }, include: { appointment: true } });
  if (!reminder || reminder.status !== "PREPARED") return NextResponse.json({ error: "This reminder is no longer active." }, { status: 409 });
  await db.$transaction([db.appointmentReminder.update({ where: { id: reminder.id }, data: { status, actedByUserId: session.id, actedAt: new Date() } }), db.activityLog.create({ data: { userId: session.id, action: `REMINDER_${status}`, entityType: "AppointmentReminder", entityId: reminder.id, summary: `Reminder for ${reminder.appointment.reference} marked ${status.toLowerCase()}` } })]);
  return NextResponse.json({ ok: true });
}
