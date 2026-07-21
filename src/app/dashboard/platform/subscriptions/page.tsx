import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SubscriptionManager } from "@/components/subscription-manager";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function Subscriptions() {
  if (!(await requirePlatformOwner())) notFound();
  const plans = await db.subscriptionPlan.findMany({ orderBy: { fee: "asc" } });
  return (
    <>
      <PageHeading eyebrow="Platform billing" title="Subscription plans" />
      <SubscriptionManager plans={plans} />
    </>
  );
}
