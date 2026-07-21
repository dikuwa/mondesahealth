import {
  addDays,
  addHours,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parse,
  startOfDay,
} from "date-fns";
import { db } from "./db";

export async function availableSlots(
  dateString: string,
  now: Date,
  practiceId: string,
  providerId?: string,
  serviceId?: string,
) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  const setting = await db.practiceSetting.findUnique({
    where: { practiceId },
  });
  const earliest = addHours(now, setting?.minNoticeHours ?? 2);
  const latestDay = startOfDay(addDays(now, setting?.maxAdvanceDays ?? 60));
  if (
    isBefore(startOfDay(date), startOfDay(now)) ||
    isAfter(startOfDay(date), latestDay)
  )
    return [];
  const rule = await db.availabilityRule.findUnique({
    where: { practiceId_weekday: { practiceId, weekday: date.getDay() } },
  });
  if (!rule?.active) return [];
  const dayStart = startOfDay(date);
  const nextDay = addMinutes(dayStart, 1440);
  const [appointments, blocks, holds, providerRule, service] =
    await Promise.all([
      db.appointment.findMany({
        where: {
          practiceId,
          ...(providerId ? { providerId } : {}),
          startAt: { gte: dayStart, lt: nextDay },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      }),
      db.blockedTime.findMany({
        where: {
          practiceId,
          ...(providerId
            ? { OR: [{ providerId: null }, { providerId }] }
            : { providerId: null }),
          startAt: { lt: nextDay },
          endAt: { gt: dayStart },
        },
      }),
      db.appointmentChangeRequest.findMany({
        where: {
          appointment: { practiceId },
          status: "PENDING",
          expiresAt: { gt: now },
          proposedStartAt: { gte: dayStart, lt: nextDay },
        },
      }),
      providerId
        ? db.providerAvailability.findUnique({
            where: {
              providerId_weekday: { providerId, weekday: date.getDay() },
            },
          })
        : null,
      serviceId
        ? db.departmentService.findFirst({
            where: { id: serviceId, practiceId, active: true },
          })
        : null,
    ]);
  if (appointments.length >= rule.maximumPerDay) return [];
  if (providerId && (!providerRule || !providerRule.active)) return [];
  let cursor = parse(providerRule?.openTime || rule.openTime, "HH:mm", date);
  const close = parse(providerRule?.closeTime || rule.closeTime, "HH:mm", date);
  const lunchStart = providerRule?.breakStart
    ? parse(providerRule.breakStart, "HH:mm", date)
    : rule.lunchStart
      ? parse(rule.lunchStart, "HH:mm", date)
      : null;
  const lunchEnd = providerRule?.breakEnd
    ? parse(providerRule.breakEnd, "HH:mm", date)
    : rule.lunchEnd
      ? parse(rule.lunchEnd, "HH:mm", date)
      : null;
  const durationMinutes = service?.durationMinutes || rule.durationMinutes;
  const result: string[] = [];
  while (!isAfter(addMinutes(cursor, durationMinutes), close)) {
    const end = addMinutes(cursor, durationMinutes);
    const lunch =
      lunchStart &&
      lunchEnd &&
      isBefore(cursor, lunchEnd) &&
      isAfter(end, lunchStart);
    const collision = appointments.some(
      (a) =>
        a.startAt &&
        a.endAt &&
        isBefore(cursor, a.endAt) &&
        isAfter(end, a.startAt),
    );
    const blocked = blocks.some(
      (b) => isBefore(cursor, b.endAt) && isAfter(end, b.startAt),
    );
    const held = holds.some(
      (h) =>
        isBefore(cursor, h.proposedEndAt) && isAfter(end, h.proposedStartAt),
    );
    if (
      !lunch &&
      !collision &&
      !blocked &&
      !held &&
      !isBefore(cursor, earliest)
    )
      result.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, rule.durationMinutes + rule.bufferMinutes);
  }
  return result;
}

export async function nextAvailableSlot(now: Date, practiceId: string) {
  const setting = await db.practiceSetting.findUnique({
    where: { practiceId },
  });
  for (let offset = 0; offset <= (setting?.maxAdvanceDays ?? 60); offset += 1) {
    const date = addDays(now, offset);
    const dateString = format(date, "yyyy-MM-dd");
    const slots = await availableSlots(dateString, now, practiceId);
    if (slots[0]) return new Date(`${dateString}T${slots[0]}:00`);
  }
  return null;
}
