"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/ui/status-badge";

type ActivationAction = "ACTIVE_PRIVATE" | "ACTIVE_PUBLIC";

interface PracticeActivationCardProps {
  practiceId: string;
  practiceName: string;
  practiceType: string;
  currentStatus: string;
  currentStatusLabel: string;
  onActivated?: (newStatus: string) => void;
}

function statusIcon(status: string) {
  switch (status) {
    case "PENDING_SETUP":
      return <Lock size={20} />;
    case "ONBOARDING":
      return <Loader2 size={20} className="toast-spinner" />;
    case "PENDING_VERIFICATION":
      return <ShieldCheck size={20} />;
    case "ACTIVE_PRIVATE":
      return <CheckCircle2 size={20} />;
    case "ACTIVE_PUBLIC":
      return <Globe size={20} />;
    case "SUSPENDED":
      return <AlertTriangle size={20} />;
    case "DEACTIVATED":
      return <Lock size={20} />;
    default:
      return <CheckCircle2 size={20} />;
  }
}

const STEP_CONFIG: Record<
  string,
  { label: string; description: string; color: string }
> = {
  PENDING_SETUP: {
    label: "Awaiting setup",
    description: "Practice is waiting for the owner to begin onboarding.",
    color: "#b88736",
  },
  ONBOARDING: {
    label: "Onboarding in progress",
    description: "The practice owner is completing their profile setup.",
    color: "#b88736",
  },
  PENDING_VERIFICATION: {
    label: "Verification pending",
    description:
      "Onboarding is complete. Review and activate the workspace below.",
    color: "#b88736",
  },
  ACTIVE_PRIVATE: {
    label: "Active (private)",
    description:
      "Workspace is active. Publish to make it publicly visible and bookable.",
    color: "var(--green)",
  },
  ACTIVE_PUBLIC: {
    label: "Active (public)",
    description:
      "Fully active with a public profile and online booking enabled.",
    color: "var(--green)",
  },
  SUSPENDED: {
    label: "Suspended",
    description: "Practice access has been temporarily suspended.",
    color: "#c2574c",
  },
  DEACTIVATED: {
    label: "Deactivated",
    description: "Practice has been deactivated. Cannot be reactivated.",
    color: "#8d6a6a",
  },
};

export function PracticeActivationCard({
  practiceId,
  practiceName,
  practiceType,
  currentStatus,
  currentStatusLabel,
  onActivated,
}: PracticeActivationCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActivationAction | null>(
    null,
  );
  const [note, setNote] = useState("");

  const config = STEP_CONFIG[currentStatus] || {
    label: currentStatusLabel,
    description: "Current practice status.",
    color: "#60736d",
  };

  async function handleActivate(status: ActivationAction) {
    if (status === "ACTIVE_PUBLIC" && !confirmAction) {
      setConfirmAction(status);
      return;
    }
    setConfirmAction(null);
    setBusy(true);
    const toastId = toast.loading(
      status === "ACTIVE_PRIVATE"
        ? "Activating practice workspace…"
        : "Publishing practice profile…",
    );
    try {
      const response = await fetch(
        `/api/platform/practices/${practiceId}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(note.trim() ? { note: note.trim() } : {}),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Activation failed");
      toast.success(
        status === "ACTIVE_PRIVATE"
          ? "Practice workspace activated"
          : "Practice published publicly",
        { id: toastId },
      );
      onActivated?.(status);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not activate practice",
        { id: toastId },
      );
    } finally {
      setBusy(false);
      setNote("");
    }
  }

  async function handleSendBack() {
    setBusy(true);
    const toastId = toast.loading("Sending practice back to onboarding…");
    try {
      const response = await fetch(
        `/api/platform/practices/${practiceId}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ONBOARDING",
            ...(note.trim() ? { note: note.trim() } : {}),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send back");
      toast.success("Practice moved back to onboarding", { id: toastId });
      onActivated?.("ONBOARDING");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not send practice back",
        { id: toastId },
      );
    } finally {
      setBusy(false);
      setNote("");
    }
  }

  if (confirmAction === "ACTIVE_PUBLIC") {
    return (
      <div className="card dashboard-card activation-card confirmation">
        <div className="activation-card-header">
          <Globe size={22} />
          <div>
            <h3>Publish this practice?</h3>
            <p>
              This will make <strong>{practiceName}</strong> publicly visible on
              the platform directory and enable online booking for patients.
            </p>
          </div>
        </div>
        <div className="activation-confirm-details">
          <div className="confirmation-row">
            <span>Practice</span>
            <strong>{practiceName}</strong>
          </div>
          <div className="confirmation-row">
            <span>Type</span>
            <strong>{practiceType.replaceAll("_", " ")}</strong>
          </div>
          <div className="confirmation-row">
            <span>Action</span>
            <strong>Publish public profile</strong>
          </div>
        </div>
        <div className="form-actions">
          <button
            className="btn btn-light"
            disabled={busy}
            onClick={() => setConfirmAction(null)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => handleActivate("ACTIVE_PUBLIC")}
          >
            {busy && <Loader2 className="toast-spinner" size={16} />}
            Confirm publish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card dashboard-card activation-card">
      <div className="activation-card-header">
        <span
          className="activation-status-icon"
          style={{ color: config.color }}
        >
          {statusIcon(currentStatus)}
        </span>
        <div>
          <h3>Lifecycle: {config.label}</h3>
          <p>{config.description}</p>
        </div>
      </div>

      <div className="activation-status-bar">
        <div
          className={`activation-step${currentStatus === "PENDING_SETUP" || currentStatus === "ONBOARDING" ? " is-current" : ""}${currentStatus === "PENDING_VERIFICATION" ? " is-done" : ""}${currentStatus === "ACTIVE_PRIVATE" || currentStatus === "ACTIVE_PUBLIC" || currentStatus === "SUSPENDED" ? " is-done" : ""}`}
        >
          <Lock size={14} />
          <span>Setup</span>
        </div>
        <div className="activation-step-connector" />
        <div
          className={`activation-step${currentStatus === "ONBOARDING" ? " is-current" : ""}${currentStatus === "PENDING_VERIFICATION" ? " is-done" : ""}${currentStatus === "ACTIVE_PRIVATE" || currentStatus === "ACTIVE_PUBLIC" ? " is-done" : ""}`}
        >
          <ShieldCheck size={14} />
          <span>Verify</span>
        </div>
        <div className="activation-step-connector" />
        <div
          className={`activation-step${currentStatus === "PENDING_VERIFICATION" ? " is-current" : ""}${currentStatus === "ACTIVE_PRIVATE" || currentStatus === "ACTIVE_PUBLIC" ? " is-done" : ""}`}
        >
          <CheckCircle2 size={14} />
          <span>Activate</span>
        </div>
        <div className="activation-step-connector" />
        <div
          className={`activation-step${currentStatus === "ACTIVE_PRIVATE" || currentStatus === "ACTIVE_PUBLIC" ? " is-done" : ""}${currentStatus === "ACTIVE_PUBLIC" ? " is-current" : ""}`}
        >
          <Globe size={14} />
          <span>Publish</span>
        </div>
      </div>

      {currentStatus === "PENDING_VERIFICATION" && (
        <div className="activation-actions">
          <div className="activation-action-row">
            <Eye size={18} />
            <div>
              <strong>Private activation</strong>
              <small>
                Activate the practice workspace without making it public. The
                owner can access the dashboard and manage settings.
              </small>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => handleActivate("ACTIVE_PRIVATE")}
            >
              {busy ? (
                <Loader2 className="toast-spinner" size={16} />
              ) : (
                <Lock size={15} />
              )}
              Activate
            </button>
          </div>
          <div className="activation-action-row">
            <Globe size={18} />
            <div>
              <strong>Publish immediately</strong>
              <small>
                Activate and publish the practice in one step. The practice
                becomes visible on the platform directory.
              </small>
            </div>
            <button
              className="btn btn-light"
              disabled={busy}
              onClick={() => handleActivate("ACTIVE_PUBLIC")}
            >
              {busy ? (
                <Loader2 className="toast-spinner" size={16} />
              ) : (
                <Globe size={15} />
              )}
              Publish
            </button>
          </div>
          <div className="activation-action-row activation-sendback">
            <AlertTriangle size={18} />
            <div>
              <strong>Send back for changes</strong>
              <small>
                Return this practice to the onboarding stage if more information
                is needed.
              </small>
            </div>
            <button
              className="btn btn-light"
              disabled={busy}
              onClick={handleSendBack}
            >
              Send back
            </button>
          </div>
          {(busy || note) && (
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Admin note (optional)</span>
              <textarea
                className="input"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note recorded in audit log"
              />
            </label>
          )}
        </div>
      )}

      {currentStatus === "ACTIVE_PRIVATE" && (
        <div className="activation-actions">
          <div className="activation-action-row">
            <Globe size={18} />
            <div>
              <strong>Publish public profile</strong>
              <small>
                Make this practice visible on the platform directory with online
                booking enabled.
              </small>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => handleActivate("ACTIVE_PUBLIC")}
            >
              {busy ? (
                <Loader2 className="toast-spinner" size={16} />
              ) : (
                <Globe size={15} />
              )}
              Publish
            </button>
          </div>
          <label className="field">
            <span>Admin note (optional)</span>
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note recorded in audit log"
            />
          </label>
        </div>
      )}

      {currentStatus === "SUSPENDED" && (
        <div className="activation-actions">
          <div className="activation-action-row">
            <CheckCircle2 size={18} />
            <div>
              <strong>Reinstate practice</strong>
              <small>
                Reactivate this practice as a private workspace. Review the
                suspension reason before reinstating.
              </small>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => handleActivate("ACTIVE_PRIVATE")}
            >
              {busy ? (
                <Loader2 className="toast-spinner" size={16} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Reinstate
            </button>
          </div>
        </div>
      )}

      {!["PENDING_VERIFICATION", "ACTIVE_PRIVATE", "SUSPENDED"].includes(
        currentStatus,
      ) && (
        <div className="activation-info">
          <StatusBadge value={currentStatus} />
          <small>No actions available for this lifecycle stage.</small>
        </div>
      )}
    </div>
  );
}
