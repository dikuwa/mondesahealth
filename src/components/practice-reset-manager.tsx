"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

type Counts = { patients: number; appointments: number; invoices: number; payments: number; claims: number; batches: number; attachments: number; departments: number; services: number; providers: number; activity: number; totalDirectory: number };

export function PracticeResetManager({ isOwner }: { isOwner: boolean }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!isOwner) return; fetch("/api/practice/reset-preview").then((r) => r.ok ? r.json() : null).then((data) => data?.counts && setCounts(data.counts)).catch(() => undefined); }, [isOwner]);
  if (!isOwner) return null;
  async function reset() {
    setBusy(true);
    try { const response = await fetch("/api/practice/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success("Practice reset completed"); setOpen(false); setConfirmation(""); setCounts(data.counts); window.location.reload(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The reset could not be completed"); }
    finally { setBusy(false); }
  }
  const total = counts ? counts.patients + counts.appointments + counts.invoices + counts.payments + counts.claims + counts.batches + counts.attachments + counts.totalDirectory : null;
  return <section className="card dashboard-card dashboard-span-all practice-reset-card">
    <div className="settings-card-heading"><h2><AlertTriangle size={19} /> Start from scratch</h2><p className="muted">Owner-only destructive reset. Removes operational records and public directory content while preserving staff accounts, reference datasets, availability rules, and the protected GP booking shell.</p></div>
    {counts && <div className="reset-counts">{[["Patients", counts.patients], ["Appointments", counts.appointments], ["Invoices / payments", counts.invoices + counts.payments], ["Claims / batches", counts.claims + counts.batches], ["Attachments", counts.attachments], ["Directory records", counts.totalDirectory], ["Activity entries", counts.activity]].map(([label, value]) => <div key={String(label)}><b>{value}</b><span>{label}</span></div>)}</div>}
    <button className="btn btn-danger" type="button" disabled={!counts || total === 0} onClick={() => setOpen(true)}><RotateCcw size={16} />Start from scratch</button>
    {open && <div className="appointment-modal" role="dialog" aria-modal="true"><button className="appointment-modal-backdrop" aria-label="Close reset" onClick={() => setOpen(false)} /><form className="appointment-panel" onSubmit={(event) => { event.preventDefault(); reset(); }}><div className="appointment-panel-heading"><div><span className="eyebrow">Irreversible action</span><h2>Reset this practice?</h2><p>This permanently deletes the records listed above and clears the activity log. Type <b>RESET MONDESA</b> to continue.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div><label className="field"><span>Confirmation phrase</span><input className="input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="RESET MONDESA" autoComplete="off" /></label><div className="appointment-panel-actions"><button type="button" className="btn btn-light" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-danger" disabled={busy || confirmation !== "RESET MONDESA"}>{busy && <Loader2 className="toast-spinner" size={16} />}Reset permanently</button></div></form></div>}
  </section>;
}
