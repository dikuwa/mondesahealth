import { addMinutes, format, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { db } from "./db";

export async function availableSlots(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const rule = await db.availabilityRule.findUnique({ where: { weekday: date.getDay() } });
  if (!rule?.active) return [];
  const dayStart = startOfDay(date);
  const nextDay = addMinutes(dayStart, 1440);
  const [appointments, blocks] = await Promise.all([
    db.appointment.findMany({ where: { startAt: { gte: dayStart, lt: nextDay }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } }),
    db.blockedTime.findMany({ where: { startAt: { lt: nextDay }, endAt: { gt: dayStart } } }),
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
    if (!lunch && !collision && !blocked && isAfter(cursor, new Date())) result.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, rule.durationMinutes + rule.bufferMinutes);
  }
  return result;
}
