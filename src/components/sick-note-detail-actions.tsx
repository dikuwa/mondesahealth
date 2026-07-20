"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Download, Eye, Loader2, Mail, MessageCircle, ShieldX } from "lucide-react";
import toast from "react-hot-toast";
import { PromptDialog } from "@/components/ui/prompt-dialog";

export function SickNoteDetailActions({ id, status, canManage }: { id: string; status: string; canManage: boolean }) {
  const router = useRouter(); const [reason, setReason] = useState(""), [revoking, setRevoking] = useState(false), [busy, setBusy] = useState(false);
  async function action(value: "DUPLICATE" | "REVOKE") {
    setBusy(true); const toastId = toast.loading(value === "DUPLICATE" ? "Creating a new draft…" : "Revoking certificate…");
    const response = await fetch(`/api/sick-notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value, reason }) }); const data = await response.json();
    if (!response.ok) toast.error(data.error || "Action failed.", { id: toastId }); else { toast.success(value === "DUPLICATE" ? "New draft created" : "Certificate revoked", { id: toastId }); setRevoking(false); router.push(value === "DUPLICATE" ? `/dashboard/sick-notes/${data.id}` : `/dashboard/sick-notes/${id}`); router.refresh(); }
    setBusy(false);
  }
  async function share(channel: string) { const response = await fetch(`/api/sick-notes/${id}/share`, { method: "POST" }); const data = await response.json(); if (!response.ok) return toast.error(data.error); if (channel === "copy") { await navigator.clipboard.writeText(data.message); toast.success("Secure sharing message copied"); } else window.open(channel === "whatsapp" ? data.whatsappUrl : data.emailUrl || `mailto:?body=${encodeURIComponent(data.message)}`, "_self"); }
  return <><div className="sick-note-detail-actions">{status === "ISSUED" && <><a className="btn btn-light" target="_blank" href={`/api/sick-notes/${id}/pdf`}><Eye size={16} /> View PDF</a><a className="btn btn-light" href={`/api/sick-notes/${id}/pdf?download=1`}><Download size={16} /> Download</a>{canManage && <><button className="btn btn-light" onClick={() => share("copy")}><Mail size={16} /> Copy message</button><button className="btn btn-light" onClick={() => share("whatsapp")}><MessageCircle size={16} /> WhatsApp</button><button className="btn btn-light" onClick={() => share("email")}><Mail size={16} /> Email</button><button className="btn btn-danger" onClick={() => setRevoking(true)}><ShieldX size={16} /> Revoke</button></>}</>}{canManage && status !== "DRAFT" && <button className="btn btn-primary" disabled={busy} onClick={() => action("DUPLICATE")}>{busy ? <Loader2 className="toast-spinner" size={16} /> : <CopyPlus size={16} />} Duplicate as draft</button>}</div><PromptDialog open={revoking} title="Revoke this medical certificate?" description="Verification will immediately show that this certificate is revoked. The reason is retained in the audit history." label="Reason for revocation" value={reason} placeholder="Enter a clear reason" confirmLabel="Revoke certificate" danger busy={busy} onChange={setReason} onCancel={() => setRevoking(false)} onConfirm={() => action("REVOKE")} /></>;
}
