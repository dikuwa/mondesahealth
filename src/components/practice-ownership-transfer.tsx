"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Clipboard, ShieldCheck } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function PracticeOwnershipTransfer({
  practiceId,
  practiceName,
  registeredEmail,
  independentOwnerReady,
  canFinalize,
}: {
  practiceId: string;
  practiceName: string;
  registeredEmail: string | null;
  independentOwnerReady: boolean;
  canFinalize: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function invite() {
    setBusy(true);
    const toastId = toast.loading("Creating owner invitation…");
    try {
      const response = await fetch("/api/platform/practices/transfer-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "INVITE", practiceId, sendInvitationEmail: sendEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInviteUrl(data.inviteUrl);
      toast.success(data.emailDelivery?.sent ? "Owner invitation created and emailed" : "Owner invitation created", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invitation", { id: toastId });
    } finally { setBusy(false); }
  }

  async function finalize() {
    setBusy(true);
    const toastId = toast.loading("Finalizing account separation…");
    try {
      const response = await fetch("/api/platform/practices/transfer-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINALIZE", practiceId, confirmation: "SEPARATE PLATFORM AND PRACTICE" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Platform and practice ownership are now separated", { id: toastId });
      router.replace("/login?reason=session-expired");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finalize separation", { id: toastId });
    } finally { setBusy(false); setConfirming(false); }
  }

  return (
    <section className="card dashboard-card content-card">
      <div className="manager-toolbar">
        <div><h2>Independent practice ownership</h2><p>Transfer {practiceName} to its registered owner before removing the platform account&apos;s temporary practice access.</p></div>
        <ShieldCheck size={24} />
      </div>
      <p className="notice-info">Registered owner email: {registeredEmail || "Not configured"}</p>
      {!independentOwnerReady ? (
        <div className="form-actions">
          <label className="custom-checkbox"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /><span>Email the invitation (optional)</span></label>
          <button className="btn btn-primary" type="button" disabled={busy || !registeredEmail} onClick={invite}>Create owner invitation</button>
        </div>
      ) : <p className="notice-info">An independent active practice owner is ready. Separation can now be finalized.</p>}
      {inviteUrl && <div className="password-copy-banner" role="status"><div><b>Secure owner invitation</b><code>{inviteUrl}</code></div><button className="btn btn-light" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${inviteUrl}`).then(() => toast.success("Invitation copied"))}><Clipboard size={16} /> Copy</button></div>}
      {canFinalize && independentOwnerReady && <button className="btn btn-danger" type="button" disabled={busy} onClick={() => setConfirming(true)}>Finalize strict separation</button>}
      <ConfirmationDialog open={confirming} title="Finalize platform separation?" description="The platform owner will immediately lose access to this practice workspace and will be signed out. The independent practice owner will retain access." confirmLabel="Finalize separation" danger busy={busy} onCancel={() => setConfirming(false)} onConfirm={finalize} />
    </section>
  );
}
