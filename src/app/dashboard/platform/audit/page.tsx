import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PlatformAuditExplorer } from "@/components/platform-audit-explorer";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlatformAudit() {
  if (!(await requirePlatformPermission("VIEW_PLATFORM_AUDIT"))) notFound();
  const logs = await db.activityLog.findMany({
    where: { OR: [{ practiceId: null }, { action: { startsWith: "PLATFORM_" } }, { action: { startsWith: "PRACTICE_" } }, { action: { startsWith: "SUBSCRIPTION_" } }, { action: "WORKSPACE_SCOPE_CHANGED" }] },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return <><PageHeading eyebrow="Security & governance" title="Platform audit log"/><PlatformAuditExplorer logs={logs.map((log) => ({ id: log.id, action: log.action, actor: log.user?.name || "System", summary: log.summary, practiceId: log.practiceId, createdAt: log.createdAt.toISOString() }))}/></>;
}
