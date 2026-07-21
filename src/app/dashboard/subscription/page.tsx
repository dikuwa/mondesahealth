import { PageHeading, Stat } from "@/components/dashboard";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PracticeSubscriptionPage() {
  const session = await getSession();
  if (!session) return null;
  const subscription = await db.practiceSubscription.findFirst({ where: { practiceId: session.practiceId }, include: { plan: true, payments: { orderBy: { paidAt: "desc" }, take: 12 } }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Practice account" title="Subscription"/><div className="dashboard-stats"><Stat label="Plan" value={subscription?.plan.name || "Not assigned"}/><Stat label="Status" value={subscription?.status || "ACTIVE"}/><Stat label="Renewal date" value={subscription?.renewalDate?.toLocaleDateString("en-NA") || "Not set"}/><Stat label="Grace until" value={subscription?.graceUntil?.toLocaleDateString("en-NA") || "Not applicable"}/></div>{subscription && <div className="card dashboard-card"><h2>Recent payments</h2><div className="record-stack">{subscription.payments.map((payment) => <article className="record-row" key={payment.id}><div><b>N${payment.amount.toFixed(2)}</b><small>{payment.paidAt.toLocaleDateString("en-NA")} · {payment.reference || payment.method || "Recorded payment"}</small></div></article>)}{!subscription.payments.length && <div className="dashboard-empty">No subscription payments recorded.</div>}</div></div>}</>;
}
