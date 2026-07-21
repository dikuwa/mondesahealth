import { endOfDay, startOfDay } from "date-fns";
import {
  PageHeading,
  QuickActions,
  Stat,
  Status,
} from "@/components/dashboard";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/utils";
import { windhoekGreeting } from "@/lib/greeting";
import { nextAvailableSlot } from "@/lib/slots";
import { getDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const today = new Date();
  const session = await getSession();
  if (!session) return null;
  const [
    appointments,
    pending,
    claims,
    balances,
    payments,
    nextSlot,
    reminders,
  ] = await Promise.all([
    db.appointment.findMany({
      where: {
        practiceId: session.practiceId,
        startAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      include: { patient: true },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.count({
      where: {
        practiceId: session.practiceId,
        status: {
          in: [
            "NEW_REQUEST",
            "PENDING_CONFIRMATION",
            "RESCHEDULE_PROPOSED",
            "RESCHEDULE_REQUESTED",
            "REVIEW_REQUIRED",
          ],
        },
      },
    }),
    db.claim.count({
      where: {
        practiceId: session.practiceId,
        status: {
          in: [
            "NEEDS_INFORMATION",
            "MISSING_INFORMATION",
            "REJECTED",
            "RESUBMISSION_REQUIRED",
          ],
        },
      },
    }),
    db.invoice.aggregate({
      _sum: { total: true, patientPaid: true, medicalAidPaid: true },
      where: { practiceId: session.practiceId, status: { not: "VOID" } },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        practiceId: session.practiceId,
        paidAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    }),
    nextAvailableSlot(today, session.practiceId),
    getDueReminders(session.practiceId, today),
  ]);
  const greeting = windhoekGreeting(today);
  const localDate = new Intl.DateTimeFormat("en-NA", {
    timeZone: "Africa/Windhoek",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);
  const firstName = session?.name.trim().split(/\s+/)[0] || "there";
  const outstanding =
    (balances._sum.total || 0) -
    (balances._sum.patientPaid || 0) -
    (balances._sum.medicalAidPaid || 0);
  return (
    <>
      <PageHeading
        eyebrow={`${localDate} · Practice overview`}
        title={`${greeting}, ${firstName}.`}
        action={<QuickActions />}
      />
      <div className="dashboard-stats">
        <Stat label="Today's appointments" value={appointments.length} />
        <Stat label="Pending requests" value={pending} />
        <Stat label="Reminders due" value={reminders.length} />
        <Stat label="Claims needing attention" value={claims} />
        <Stat label="Outstanding balances" value={money(outstanding)} />
        <Stat label="Received today" value={money(payments._sum.amount || 0)} />
      </div>
      <div className="dashboard-two-column">
        <section className="card dashboard-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 18px" }}>Today’s agenda</h2>
          {appointments.length ? (
            <div style={{ display: "grid" }}>
              {appointments.map((a) => (
                <div key={a.id} className="agenda-row">
                  <b>
                    {a.startAt?.toLocaleTimeString("en-NA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Windhoek",
                    })}
                  </b>
                  <div>
                    <b style={{ fontSize: 14 }}>{a.patient.fullName}</b>
                    <small
                      style={{
                        display: "block",
                        color: "#6d7f79",
                        marginTop: 3,
                      }}
                    >
                      {a.patient.phone} · {a.reason}
                    </small>
                  </div>
                  <Status value={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ padding: 35, textAlign: "center", color: "#71827c" }}>
              No appointments scheduled for today.
            </p>
          )}
        </section>
        <section className="card dashboard-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 18px" }}>Practice pulse</h2>
          <div style={{ background: "#dcece6", borderRadius: 15, padding: 20 }}>
            <small>Next available appointment</small>
            <b
              style={{
                display: "block",
                fontSize: 25,
                letterSpacing: "-.035em",
                marginTop: 8,
              }}
            >
              {nextSlot
                ? new Intl.DateTimeFormat("en-NA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Windhoek",
                  }).format(nextSlot)
                : "No slot available"}
            </b>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#63766f" }}>
            Availability is based on working hours, lunch breaks, existing
            bookings and blocked time.
          </p>
        </section>
      </div>
    </>
  );
}
