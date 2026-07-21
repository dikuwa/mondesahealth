import { notFound } from "next/navigation";
import { PageHeading, Stat } from "@/components/dashboard";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Analytics() {
  if (!(await requirePlatformPermission("VIEW_PLATFORM_ANALYTICS"))) notFound();
  const [practices, active, appointments, patients, payments] = await db.$transaction([
    db.practice.count(),
    db.practice.count({ where: { status: "ACTIVE" } }),
    db.appointment.count(),
    db.patient.count(),
    db.subscriptionPayment.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const subscriptions = await db.practiceSubscription.groupBy({ by: ["status"], orderBy: { status: "asc" }, _count: { _all: true } });
  return <><PageHeading eyebrow="Platform administration" title="Platform analytics"/><div className="dashboard-stats"><Stat label="Registered practices" value={practices}/><Stat label="Active practices" value={active}/><Stat label="Appointments" value={appointments}/><Stat label="Practice-owned patient profiles" value={patients}/><Stat label="Subscription payments" value={payments._count._all}/><Stat label="Platform revenue recorded" value={`N$${(payments._sum.amount || 0).toFixed(2)}`}/></div><div className="card dashboard-card platform-breakdown"><h2>Subscription status</h2><div className="platform-breakdown-grid">{subscriptions.map((row) => <div key={row.status}><span>{row.status.replaceAll("_", " ")}</span><b>{row._count._all}</b></div>)}</div></div><p className="notice-info">Aggregate operational counts only. Clinical note content and practice finance records are not available here.</p></>;
}
