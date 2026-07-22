"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

type Log = { id: string; action: string; actor: string; summary: string; practiceId: string | null; createdAt: string };
const pageSize = 50;

export function PlatformAuditExplorer({ logs }: { logs: Log[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const actions = useMemo(() => [...new Set(logs.map((log) => log.action))].sort(), [logs]);
  const filtered = useMemo(() => logs.filter((log) => {
    const matchesAction = !action || log.action === action;
    const text = `${log.action} ${log.actor} ${log.summary} ${log.practiceId || "platform"}`.toLowerCase();
    return matchesAction && text.includes(query.trim().toLowerCase());
  }), [action, logs, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  function exportCsv() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["Timestamp,Actor,Action,Scope,Summary", ...filtered.map((log) => [log.createdAt, log.actor, log.action, log.practiceId || "Platform", log.summary].map(escape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `mondesa-platform-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <><div className="manager-toolbar platform-filter-toolbar"><div className="search-box"><Search size={17}/><input className="input" aria-label="Search platform audit" placeholder="Search actor, action, practice or summary" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}/></div><CustomSelect value={action} onChange={(value) => { setAction(value); setPage(1); }} options={[{ value: "", label: "All actions" }, ...actions.map((value) => ({ value, label: value.replaceAll("_", " ") }))]}/><button className="btn btn-light export-button" onClick={exportCsv} disabled={!filtered.length}><Download size={16}/><span>Export CSV</span></button></div><section className="card dashboard-card panel-card audit-panel"><div className="record-stack">{visible.map((log) => <article className="record-row platform-audit-row" key={log.id}><div><div className="audit-row-heading"><span className="audit-action">{log.action.replaceAll("_", " ")}</span><small>{new Date(log.createdAt).toLocaleString("en-NA")} · {log.actor} · {log.practiceId || "Platform"}</small></div><p>{log.summary}</p></div></article>)}{!visible.length && <div className="dashboard-empty"><h3>No matching audit events</h3><p>Change the filters or return after platform activity has been recorded.</p></div>}</div>{filtered.length > pageSize && <div className="pagination-bar"><span>{filtered.length} events · Page {Math.min(page, pages)} of {pages}</span><div><button className="btn btn-light" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="btn btn-light" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</button></div></div>}</section></>;
}
