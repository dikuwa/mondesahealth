"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Search, Share2, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { DocumentPreviewModal, DocumentShareModal, type DocumentShare } from "@/components/ui/document-actions";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type Row = { id: string; certificateNumber: string; patient: string; patientPhone: string; patientWhatsapp: string | null; patientEmail: string | null; purpose: string; status: string; consultationDate: string; leaveFrom: string; leaveTo: string; doctor: string };
const displayPurpose = (value: string) => value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function SickNotesList({ rows, canManage }: { rows: Row[]; canManage: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(""), [status, setStatus] = useState("ALL"), [purpose, setPurpose] = useState("ALL"), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [viewing, setViewing] = useState<Row | null>(null), [sharing, setSharing] = useState<Row | null>(null), [share, setShare] = useState<DocumentShare | null>(null), [revoking, setRevoking] = useState<Row | null>(null), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  const visible = useMemo(() => rows.filter((row) => (!query.trim() || `${row.certificateNumber} ${row.patient} ${row.doctor}`.toLowerCase().includes(query.toLowerCase())) && (status === "ALL" || row.status === status) && (purpose === "ALL" || row.purpose === purpose) && (!from || row.consultationDate.slice(0, 10) >= from) && (!to || row.consultationDate.slice(0, 10) <= to)), [rows, query, status, purpose, from, to]);

  async function openShare(row: Row) {
    setSharing(row); setShare(null);
    try { const response = await fetch(`/api/sick-notes/${row.id}/share`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setShare({ link: data.link, message: data.message }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not create secure share link"); setSharing(null); }
  }
  async function revoke() {
    if (!revoking || reason.trim().length < 5) return;
    setBusy(true); const toastId = toast.loading("Revoking medical certificate…");
    try { const response = await fetch(`/api/sick-notes/${revoking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REVOKE", reason: reason.trim() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success(`${revoking.certificateNumber} revoked`, { id: toastId }); setRevoking(null); setReason(""); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not revoke sick note", { id: toastId }); }
    finally { setBusy(false); }
  }
  const preview = viewing ? `/api/sick-notes/${viewing.id}/pdf${viewing.status === "ISSUED" ? "" : "?preview=1"}` : "";
  return <>
    <div className="manager-toolbar"><div className="claim-filters"><div className="search-box"><Search size={17} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search certificate, patient or doctor" /></div><CustomSelect value={status} onChange={setStatus} options={["ALL", "DRAFT", "ISSUED", "REVOKED"].map((value) => ({ value, label: value === "ALL" ? "All statuses" : value }))} /><CustomSelect value={purpose} onChange={setPurpose} options={["ALL", "WORK", "SCHOOL", "OTHER"].map((value) => ({ value, label: value === "ALL" ? "All purposes" : value }))} /><DatePicker className="sick-note-filter-date" value={from} onChange={setFrom} ariaLabel="Consultation date from" placeholder="From date" /><DatePicker className="sick-note-filter-date" value={to} onChange={setTo} ariaLabel="Consultation date to" placeholder="To date" min={from || undefined} /></div></div>
    <section className="card dashboard-card sick-notes-table-card">{visible.length ? <><div className="table-scroll"><table className="data-table sick-notes-table"><thead><tr><th>Certificate No.</th><th>Patient</th><th>Purpose</th><th>Leave Period</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><Link href={`/dashboard/sick-notes/${row.id}`}><b>{row.certificateNumber}</b></Link></td><td>{row.patient}</td><td>{displayPurpose(row.purpose)}</td><td>{new Date(row.leaveFrom).toLocaleDateString("en-NA")} – {new Date(row.leaveTo).toLocaleDateString("en-NA")}</td><td>{row.doctor}</td><td><StatusBadge value={row.status} /></td><td><div className="table-actions"><button className="btn btn-light" onClick={() => setViewing(row)}><Eye size={15} /> View</button>{row.status === "ISSUED" && <><a className="btn btn-light" href={`/api/sick-notes/${row.id}/pdf?download=1`} download><Download size={15} /> PDF</a>{canManage && <button className="btn btn-light" onClick={() => openShare(row)}><Share2 size={15} /> Share</button>}{canManage && <button className="btn btn-danger" onClick={() => { setRevoking(row); setReason(""); }}><ShieldX size={15} /> Revoke</button>}</>}</div></td></tr>)}</tbody></table></div><div className="record-card-list sick-note-card-list">{visible.map((row) => <article className="record-card" key={row.id}><span className="record-card-heading"><Link href={`/dashboard/sick-notes/${row.id}`}><b>{row.certificateNumber}</b></Link><StatusBadge value={row.status} /></span><span>{row.patient}</span><small>{displayPurpose(row.purpose)} · {new Date(row.leaveFrom).toLocaleDateString("en-NA")} – {new Date(row.leaveTo).toLocaleDateString("en-NA")}</small><small>{row.doctor}</small><span className="record-card-actions"><button className="icon-action" title="View" aria-label={`View ${row.certificateNumber}`} onClick={() => setViewing(row)}><Eye size={16} /></button>{row.status === "ISSUED" && <><a className="icon-action" title="Download PDF" aria-label={`Download ${row.certificateNumber}`} href={`/api/sick-notes/${row.id}/pdf?download=1`} download><Download size={16} /></a>{canManage && <button className="icon-action" title="Share" aria-label={`Share ${row.certificateNumber}`} onClick={() => openShare(row)}><Share2 size={16} /></button>}{canManage && <button className="icon-action danger-action" title="Revoke" aria-label={`Revoke ${row.certificateNumber}`} onClick={() => { setRevoking(row); setReason(""); }}><ShieldX size={16} /></button>}</>}</span></article>)}</div></> : <div className="dashboard-inline-empty"><b>No matching sick notes</b><p>Create a draft or adjust the filters.</p></div>}</section>
    <DocumentPreviewModal open={Boolean(viewing)} eyebrow="Medical certificate preview" number={viewing?.certificateNumber || ""} previewUrl={preview} downloadUrl={viewing?.status === "ISSUED" ? `/api/sick-notes/${viewing.id}/pdf?download=1` : undefined} onClose={() => setViewing(null)} onShare={viewing?.status === "ISSUED" && canManage ? () => openShare(viewing) : undefined} secondaryAction={viewing?.status === "DRAFT" && canManage ? <Link className="btn btn-primary" href={`/dashboard/sick-notes/${viewing.id}`}>Edit draft</Link> : undefined} />
    <DocumentShareModal open={Boolean(sharing)} number={sharing?.certificateNumber || ""} kind="Medical certificate" share={share} patientPhone={sharing?.patientPhone || ""} patientWhatsapp={sharing?.patientWhatsapp || null} patientEmail={sharing?.patientEmail || null} onMessageChange={(message) => setShare((current) => current ? { ...current, message } : null)} onClose={() => { setSharing(null); setShare(null); }} />
    <PromptDialog open={Boolean(revoking)} title={`Revoke ${revoking?.certificateNumber || "medical certificate"}?`} description="The certificate will remain in the medical record and its QR verification page will show REVOKED. Add a clear reason for the audit trail." label="Reason for revocation" value={reason} placeholder="Enter the revocation reason" confirmLabel="Revoke certificate" danger busy={busy} onChange={setReason} onCancel={() => { setRevoking(null); setReason(""); }} onConfirm={revoke} />
  </>;
}
