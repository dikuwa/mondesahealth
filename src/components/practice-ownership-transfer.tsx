"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Check,
  CheckCircle2,
  Clipboard,
  LogOut,
  Mail,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
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
    <section className="card dashboard-card ownership-transfer-card" aria-labelledby="ownership-transfer-title">
      <header className="ownership-transfer-header">
        <span className="ownership-transfer-icon" aria-hidden="true">
          <ShieldCheck size={24} />
        </span>
        <div className="ownership-transfer-heading">
          <span className="eyebrow">Ownership handover</span>
          <h2 id="ownership-transfer-title">Independent practice ownership</h2>
          <p>Complete the handover of {practiceName} before removing the platform account&apos;s temporary workspace access.</p>
        </div>
        <span className={`ownership-transfer-status ${independentOwnerReady ? "is-ready" : "is-pending"}`}>
          {independentOwnerReady ? <CheckCircle2 size={16} /> : <Mail size={16} />}
          {independentOwnerReady ? "Ready to finalize" : "Owner invitation required"}
        </span>
      </header>

      <div className="ownership-transfer-body">
        <div className="ownership-owner-summary">
          <span className="ownership-transfer-label">Registered practice owner</span>
          <div className="ownership-owner-detail">
            <span className="ownership-owner-icon" aria-hidden="true"><Mail size={18} /></span>
            <div>
              <strong>{registeredEmail || "No owner email configured"}</strong>
              <small>{registeredEmail ? "Invitation and ownership destination" : "Add a registered email in the practice details above"}</small>
            </div>
          </div>
        </div>

        <div className="ownership-transfer-outcomes">
          <span className="ownership-transfer-label">What finalisation does</span>
          <ul>
            <li><UserRoundCheck size={17} /><span>The independent owner keeps access to this practice.</span></li>
            <li><LogOut size={17} /><span>Temporary platform access is removed immediately.</span></li>
            <li><ShieldCheck size={17} /><span>The current session is invalidated and the handover is audited.</span></li>
          </ul>
        </div>
      </div>

      {!independentOwnerReady ? (
        <div className="ownership-invitation-panel">
          <div>
            <h3>Invite the registered owner</h3>
            <p>A secure setup link is always created. Email delivery remains optional.</p>
          </div>
          <div className="ownership-transfer-actions">
            <label className="custom-checkbox"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /><span>Email the invitation</span></label>
            <button className="btn btn-primary" type="button" disabled={busy || !registeredEmail} onClick={invite}><Send size={16} /> Create invitation</button>
          </div>
        </div>
      ) : (
        <div className="ownership-ready-banner" role="status">
          <span aria-hidden="true"><Check size={18} /></span>
          <div><strong>Independent owner verified</strong><p>The active practice owner is in place. Strict separation can now be completed safely.</p></div>
        </div>
      )}
      {inviteUrl && <div className="password-copy-banner owner-invitation-banner" role="status"><div><b>Secure owner invitation</b><code>{inviteUrl}</code></div><button className="btn btn-light" type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${inviteUrl}`).then(() => toast.success("Invitation copied"))}><Clipboard size={16} /> Copy link</button></div>}
      {canFinalize && independentOwnerReady && (
        <footer className="ownership-finalize-panel">
          <div>
            <span className="ownership-transfer-label">Final step</span>
            <h3>Remove temporary platform access</h3>
            <p>This action signs you out and cannot be reversed from this screen.</p>
          </div>
          <button className="btn btn-danger" type="button" disabled={busy} onClick={() => setConfirming(true)}>Finalize strict separation</button>
        </footer>
      )}
      <ConfirmationDialog open={confirming} title="Finalize platform separation?" description="The platform owner will immediately lose access to this practice workspace and will be signed out. The independent practice owner will retain access." confirmLabel="Finalize separation" danger busy={busy} onCancel={() => setConfirming(false)} onConfirm={finalize} />
    </section>
  );
}
