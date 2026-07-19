"use client";

import { useId } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

export function PromptDialog({
  open,
  title,
  description,
  label,
  value,
  placeholder,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requiredValue,
  danger = false,
  busy = false,
  onChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  label: string;
  value: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requiredValue?: string;
  danger?: boolean;
  busy?: boolean;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  if (!open) return null;
  const valid = requiredValue ? value === requiredValue : Boolean(value.trim());

  return (
    <div className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="appointment-modal-backdrop" aria-label="Close prompt" onClick={onCancel} />
      <form
        className="confirmation-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !busy) onConfirm();
        }}
      >
        <div className={`confirmation-icon${danger ? " is-danger" : ""}`}>
          <AlertTriangle size={22} />
        </div>
        <div className="confirmation-copy">
          <span className="eyebrow">Please confirm</span>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="confirmation-close" type="button" onClick={onCancel} aria-label="Close prompt">
          <X size={19} />
        </button>
        <label className="field confirmation-prompt-field" htmlFor={fieldId}>
          <span>{label}</span>
          <input
            id={fieldId}
            className="input"
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            autoFocus
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <div className="confirmation-actions">
          <button className="btn btn-light" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy || !valid}>
            {busy && <Loader2 className="toast-spinner" size={17} />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
