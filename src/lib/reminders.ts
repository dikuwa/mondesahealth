import { addHours } from "date-fns";
import { db } from "@/lib/db";

export async function getDueReminders(now = new Date()) {
  const setting = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  if (setting?.reminderEnabled === false) return [];
  const appointments = await db.appointment.findMany({
    where: { status: "CONFIRMED", startAt: { gt: now, lte: addHours(now, setting?.reminderLeadHours ?? 24) } },
    include: { patient: true, reminders: true }, orderBy: { startAt: "asc" },
  });
  return appointments.flatMap(appointment => {
    const reminder = appointment.reminders.find(item => item.appointmentStartAt.getTime() === appointment.startAt!.getTime());
    if (reminder && ["SENT", "DISMISSED"].includes(reminder.status)) return [];
    return [{ id: reminder?.id || null, appointmentId: appointment.id, appointmentStartAt: appointment.startAt!, status: reminder?.status || "DUE", reference: appointment.reference, patient: appointment.patient.fullName, phone: appointment.patient.phone, whatsapp: appointment.patient.whatsapp, email: appointment.patient.email }];
  });
}
