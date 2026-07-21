import { format } from "date-fns";
import Link from "next/link";
import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
import { activityWhere } from "@/lib/activity-query";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function ActivityLog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") params.set(key, value);
  const session = await getSession();
  if (!session) return null;
  const page = Math.max(1, Number(params.get("page")) || 1),
    where = activityWhere(params, session.practiceId);
  const [logs, total, users, actions] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
    }),
    db.activityLog.count({ where }),
    db.user.findMany({
      where: { practiceId: session.practiceId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.activityLog.findMany({
      where: { practiceId: session.practiceId },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / 50));
  const link = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `?${next}`;
  };
  const exportParams = new URLSearchParams(params);
  exportParams.delete("page");
  return (
    <>
      <PageHeading eyebrow="Immutable audit trail" title="Activity log" />
      <form
        className="card dashboard-card appointment-filter-panel"
        method="get"
      >
        <div className="field">
          <label>Search</label>
          <input
            className="input"
            name="q"
            defaultValue={params.get("q") || ""}
          />
        </div>
        <div className="field">
          <label>Action</label>
          <select
            className="input"
            name="action"
            defaultValue={params.get("action") || ""}
          >
            <option value="">All actions</option>
            {actions.map((item) => (
              <option key={item.action}>{item.action}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Staff member</label>
          <select
            className="input"
            name="userId"
            defaultValue={params.get("userId") || ""}
          >
            <option value="">All staff</option>
            {users.map((user) => (
              <option value={user.id} key={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>From</label>
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={params.get("from") || ""}
          />
        </div>
        <div className="field">
          <label>To</label>
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={params.get("to") || ""}
          />
        </div>
        <button className="btn btn-primary">Apply filters</button>
        <a
          className="btn btn-light"
          href={`/api/activity/export?${exportParams}`}
        >
          Export CSV
        </a>
      </form>
      <div className="card dashboard-card" style={{ padding: 20 }}>
        {logs.map((log) => (
          <div key={log.id} className="activity-row">
            <span style={{ color: "#6e807a" }}>
              {format(log.createdAt, "dd MMM yyyy HH:mm")}
            </span>
            <b>{log.action.replaceAll("_", " ")}</b>
            <span>{log.summary}</span>
            <span>{log.user?.name || "Patient / system"}</span>
          </div>
        ))}
        {!logs.length && (
          <p className="muted">No activity matches these filters.</p>
        )}
        <div className="appointment-panel-actions">
          <Link
            className="btn btn-light"
            aria-disabled={page <= 1}
            href={page <= 1 ? link(1) : link(page - 1)}
          >
            Previous
          </Link>
          <span>
            Page {page} of {pages} · {total} records
          </span>
          <Link
            className="btn btn-light"
            aria-disabled={page >= pages}
            href={page >= pages ? link(pages) : link(page + 1)}
          >
            Next
          </Link>
        </div>
      </div>
    </>
  );
}
