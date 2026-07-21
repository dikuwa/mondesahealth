import { PageHeading } from "@/components/dashboard";
import { AvailabilityManager } from "@/components/availability-manager";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Availability() {
  const session = await getSession();
  if (!session) return null;
  const [settings, rules, blocks, providers] = await Promise.all([
    db.practiceSetting.findUnique({
      where: { practiceId: session.practiceId },
    }),
    db.availabilityRule.findMany({
      where: { practiceId: session.practiceId },
      orderBy: { weekday: "asc" },
    }),
    db.blockedTime.findMany({
      where: { practiceId: session.practiceId, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
    db.provider.findMany({ where: { practiceId: session.practiceId }, include: { availability: { orderBy: { weekday: "asc" } } }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <>
      <PageHeading eyebrow="Scheduling rules" title="Availability" />
      <AvailabilityManager
        initialBookingMode={settings?.bookingMode || "AVAILABLE_TIME"}
        initialReminderEnabled={settings?.reminderEnabled ?? true}
        initialReminderLeadHours={settings?.reminderLeadHours ?? 24}
        initialRules={rules.map((r) => ({
          weekday: r.weekday,
          active: r.active,
          openTime: r.openTime,
          closeTime: r.closeTime,
          durationMinutes: r.durationMinutes,
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
          reason: b.reason,
        }))}
        providers={providers.map((provider) => ({ id: provider.id, displayName: provider.displayName, rules: provider.availability.map((rule) => ({ weekday: rule.weekday, active: rule.active, openTime: rule.openTime, closeTime: rule.closeTime, breakStart: rule.breakStart, breakEnd: rule.breakEnd })) }))}
      />
    </>
  );
}
