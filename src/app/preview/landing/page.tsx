import { notFound } from "next/navigation";
import { PlatformLandingPage } from "@/components/platform-landing-page";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultPlatformLandingContent, getLandingRecord, getLandingSystemMetrics, parseLandingContent } from "@/lib/platform-landing";

export default async function LandingPreviewPage() {
  if (!(await requirePlatformPermission("VIEW_PLATFORM_WEBSITE"))) notFound();
  const [record, systemMetrics, practices] = await Promise.all([
    getLandingRecord(), getLandingSystemMetrics(),
    db.practice.findMany({ where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } }, select: { slug: true, name: true, type: true, town: true, logoData: true }, orderBy: { name: "asc" }, take: 6 }),
  ]);
  return <PlatformLandingPage content={parseLandingContent(record?.draftContent || defaultPlatformLandingContent)} systemMetrics={systemMetrics} practices={practices} preview />;
}
