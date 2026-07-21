import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityWhere } from "@/lib/activity-query";

const csv = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  const session = await requirePermission("VIEW_ACTIVITY");
  if (!session)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const url = new URL(request.url);
  const rows = await db.activityLog.findMany({
    where: activityWhere(url.searchParams, session.practiceId),
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const content = [
    ["Date", "Action", "Entity type", "Entity ID", "Summary", "Staff"]
      .map(csv)
      .join(","),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.action,
        row.entityType,
        row.entityId,
        row.summary,
        row.user?.name || "Patient / system",
      ]
        .map(csv)
        .join(","),
    ),
  ].join("\r\n");
  await db.activityLog.create({
    data: {
      practiceId: session.practiceId,
      userId: session.id,
      action: "ACTIVITY_EXPORTED",
      entityType: "ActivityLog",
      entityId: "filtered",
      summary: `Exported ${rows.length} filtered activity rows`,
    },
  });
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
