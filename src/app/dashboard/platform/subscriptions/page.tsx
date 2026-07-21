import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SubscriptionManager } from "@/components/subscription-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function Subscriptions() {
  const session = await requirePlatformPermission("VIEW_PLATFORM_FINANCE");
  if (!session) notFound();
  const plans = await db.subscriptionPlan.findMany({ orderBy: { fee: "asc" } });
  return (
    <>
      <PageHeading eyebrow="Platform billing" title="Subscription plans" />
      <SubscriptionManager plans={plans} canManage={session.platformPermissions.includes("MANAGE_SUBSCRIPTIONS")} />
    </>
  );
}
