"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="confirmation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <button
        className="appointment-modal-backdrop"
        aria-label="Close confirmation"
        onClick={onCancel}
      />
      <div className="confirmation-card">
        <div className={`confirmation-icon${danger ? " is-danger" : ""}`}>
          <AlertTriangle size={22} />
        </div>
        <div className="confirmation-copy">
          <span className="eyebrow">Please confirm</span>
          <h2 id="confirmation-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button
          className="confirmation-close"
          type="button"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={19} />
        </button>
        <div className="confirmation-actions">
          <button
            className="btn btn-light"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="toast-spinner" size={17} />}{" "}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
