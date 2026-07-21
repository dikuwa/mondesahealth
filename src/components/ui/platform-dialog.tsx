"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function PlatformDialog({
  open,
  eyebrow,
  title,
  description,
  onClose,
  children,
  actions,
  wide = false,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusable = () => panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    requestAnimationFrame(() => focusable()?.[0]?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="appointment-modal-backdrop" type="button" aria-label="Close dialog" onClick={onClose} />
      <div ref={panel} className={`appointment-panel platform-dialog${wide ? " platform-dialog-wide" : ""}`}>
        <div className="appointment-panel-heading">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="platform-dialog-body">{children}</div>
        {actions && <div className="appointment-panel-actions">{actions}</div>}
      </div>
    </div>
  );
}
