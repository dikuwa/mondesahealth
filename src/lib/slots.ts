import { addDays, addHours, addMinutes, format, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { db } from "./db";

export async function availableSlots(dateString: string, now = new Date()) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  const setting = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  const earliest = addHours(now, setting?.minNoticeHours ?? 2);
  const latestDay = startOfDay(addDays(now, setting?.maxAdvanceDays ?? 60));
  if (isBefore(startOfDay(date), startOfDay(now)) || isAfter(startOfDay(date), latestDay)) return [];
  const rule = await db.availabilityRule.findUnique({ where: { weekday: date.getDay() } });
  if (!rule?.active) return [];
  const dayStart = startOfDay(date);
  const nextDay = addMinutes(dayStart, 1440);
  const [appointments, blocks, holds] = await Promise.all([
    db.appointment.findMany({ where: { startAt: { gte: dayStart, lt: nextDay }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } }),
    db.blockedTime.findMany({ where: { startAt: { lt: nextDay }, endAt: { gt: dayStart } } }),
    db.appointmentChangeRequest.findMany({where:{status:"PENDING",expiresAt:{gt:now},proposedStartAt:{gte:dayStart,lt:nextDay}}}),
  ]);
  if (appointments.length >= rule.maximumPerDay) return [];
  let cursor = parse(rule.openTime, "HH:mm", date);
  const close = parse(rule.closeTime, "HH:mm", date);
  const lunchStart = rule.lunchStart ? parse(rule.lunchStart, "HH:mm", date) : null;
  const lunchEnd = rule.lunchEnd ? parse(rule.lunchEnd, "HH:mm", date) : null;
  const result: string[] = [];
  while (!isAfter(addMinutes(cursor, rule.durationMinutes), close)) {
    const end = addMinutes(cursor, rule.durationMinutes);
    const lunch = lunchStart && lunchEnd && isBefore(cursor, lunchEnd) && isAfter(end, lunchStart);
    const collision = appointments.some((a) => a.startAt && a.endAt && isBefore(cursor, a.endAt) && isAfter(end, a.startAt));
    const blocked = blocks.some((b) => isBefore(cursor, b.endAt) && isAfter(end, b.startAt));
    const held = holds.some((h) => isBefore(cursor, h.proposedEndAt) && isAfter(end, h.proposedStartAt));
    if (!lunch && !collision && !blocked && !held && !isBefore(cursor, earliest)) result.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, rule.durationMinutes + rule.bufferMinutes);
  }
  return result;
}

export async function nextAvailableSlot(now = new Date()) {
  const setting = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  for (let offset = 0; offset <= (setting?.maxAdvanceDays ?? 60); offset += 1) {
    const date = addDays(now, offset);
    const dateString = format(date, "yyyy-MM-dd");
    const slots = await availableSlots(dateString, now);
    if (slots[0]) return new Date(`${dateString}T${slots[0]}:00`);
  }
  return null;
}
