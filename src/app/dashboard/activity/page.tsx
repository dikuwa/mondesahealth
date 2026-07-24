import { format } from "date-fns";
import Link from "next/link";
import { History, Search } from "lucide-react";
import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
import { activityWhere } from "@/lib/activity-query";
import { getPracticeSession } from "@/lib/auth";
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
  const session = await getPracticeSession();
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
      <form className="card dashboard-card activity-filter-panel" method="get">
        <div className="search-box activity-search">
          <Search size={17} />
          <input
            className="input"
            name="q"
            placeholder="Search actor, action or summary"
            defaultValue={params.get("q") || ""}
          />
        </div>
        <div className="select-wrap">
          <label className="field">
            <span>Action</span>
            <select
              className="input native-select"
              name="action"
              defaultValue={params.get("action") || ""}
            >
              <option value="">All actions</option>
              {actions.map((item) => (
                <option key={item.action}>{item.action}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="select-wrap">
          <label className="field">
            <span>Staff</span>
            <select
              className="input native-select"
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
          </label>
        </div>
        <label className="field">
          <span>From</span>
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={params.get("from") || ""}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={params.get("to") || ""}
          />
        </label>
        <div className="activity-filter-actions">
          <button className="btn btn-primary">Apply filters</button>
          <a
            className="btn btn-light"
            href={`/api/activity/export?${exportParams}`}
          >
            Export CSV
          </a>
        </div>
      </form>
      <div className="card dashboard-card">
        {logs.length > 0 && (
          <div className="record-stack">
            {logs.map((log) => (
              <article key={log.id} className="record-row activity-log-row">
                <div>
                  <div className="activity-log-heading">
                    <b className="activity-log-action">
                      {log.action.replaceAll("_", " ")}
                    </b>
                    <small>
                      {log.user?.name || "Patient / system"} ·{" "}
                      {format(log.createdAt, "dd MMM yyyy HH:mm")}
                    </small>
                  </div>
                  <p className="activity-log-summary">{log.summary}</p>
                </div>
              </article>
            ))}
          </div>
        )}
        {!logs.length && (
          <div className="dashboard-empty">
            <History size={32} />
            <h3>No activity matches these filters</h3>
            <p>Try adjusting your search or date range.</p>
          </div>
        )}
        {pages > 1 && (
          <nav
            className="pagination-bar activity-pagination"
            aria-label="Activity log pages"
          >
            <span>
              Page {page} of {pages} · {total} records
            </span>
            <div>
              <Link
                className={`btn btn-light${page <= 1 ? " is-disabled" : ""}`}
                aria-disabled={page <= 1}
                href={page <= 1 ? link(1) : link(page - 1)}
              >
                Previous
              </Link>
              <Link
                className={`btn btn-light${page >= pages ? " is-disabled" : ""}`}
                aria-disabled={page >= pages}
                href={page >= pages ? link(pages) : link(page + 1)}
              >
                Next
              </Link>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
