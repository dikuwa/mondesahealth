"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Download, Eye, Loader2, Share2, ShieldX } from "lucide-react";
import toast from "react-hot-toast";
import { DocumentPreviewModal, DocumentShareModal, type DocumentShare } from "@/components/ui/document-actions";
import { PromptDialog } from "@/components/ui/prompt-dialog";

export function SickNoteDetailActions({ id, number, status, canManage, patientPhone, patientWhatsapp, patientEmail }: { id: string; number: string; status: string; canManage: boolean; patientPhone: string; patientWhatsapp: string | null; patientEmail: string | null }) {
  const router = useRouter();
  const [reason, setReason] = useState(""), [revoking, setRevoking] = useState(false), [busy, setBusy] = useState(false), [viewing, setViewing] = useState(false), [sharing, setSharing] = useState(false), [share, setShare] = useState<DocumentShare | null>(null);
  async function action(value: "DUPLICATE" | "REVOKE") {
    setBusy(true); const toastId = toast.loading(value === "DUPLICATE" ? "Creating a new draft…" : "Revoking certificate…");
    const response = await fetch(`/api/sick-notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value, reason }) }); const data = await response.json();
    if (!response.ok) toast.error(data.error || "Action failed.", { id: toastId }); else { toast.success(value === "DUPLICATE" ? "New draft created" : "Certificate revoked", { id: toastId }); setRevoking(false); router.push(value === "DUPLICATE" ? `/dashboard/sick-notes/${data.id}` : `/dashboard/sick-notes/${id}`); router.refresh(); }
    setBusy(false);
  }
  async function openShare() {
    setSharing(true); setShare(null);
    try { const response = await fetch(`/api/sick-notes/${id}/share`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setShare({ link: data.link, message: data.message }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not create secure share link"); setSharing(false); }
  }
  const previewUrl = `/api/sick-notes/${id}/pdf${status === "ISSUED" ? "" : "?preview=1"}`;
  return <><div className="sick-note-detail-actions"><button className="btn btn-light" onClick={() => setViewing(true)}><Eye size={16} /> View</button>{status === "ISSUED" && <><a className="btn btn-light" href={`/api/sick-notes/${id}/pdf?download=1`} download><Download size={16} /> PDF</a>{canManage && <button className="btn btn-light" onClick={openShare}><Share2 size={16} /> Share</button>}{canManage && <button className="btn btn-danger" onClick={() => setRevoking(true)}><ShieldX size={16} /> Revoke</button>}</>}{canManage && status !== "DRAFT" && <button className="btn btn-primary" disabled={busy} onClick={() => action("DUPLICATE")}>{busy ? <Loader2 className="toast-spinner" size={16} /> : <CopyPlus size={16} />} Duplicate as draft</button>}</div><DocumentPreviewModal open={viewing} eyebrow="Medical certificate preview" number={number} previewUrl={previewUrl} downloadUrl={status === "ISSUED" ? `/api/sick-notes/${id}/pdf?download=1` : undefined} onClose={() => setViewing(false)} onShare={status === "ISSUED" && canManage ? openShare : undefined} /><DocumentShareModal open={sharing} number={number} kind="Medical certificate" share={share} patientPhone={patientPhone} patientWhatsapp={patientWhatsapp} patientEmail={patientEmail} onMessageChange={(message) => setShare((current) => current ? { ...current, message } : null)} onClose={() => { setSharing(false); setShare(null); }} /><PromptDialog open={revoking} title={`Revoke ${number}?`} description="The certificate will remain in the medical record and its QR verification page will show REVOKED. Add a clear reason for the audit trail." label="Reason for revocation" value={reason} placeholder="Enter the revocation reason" confirmLabel="Revoke certificate" danger busy={busy} onChange={setReason} onCancel={() => setRevoking(false)} onConfirm={() => action("REVOKE")} /></>;
}
