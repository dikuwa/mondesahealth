"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export type WorkspaceOption = { id: string; name: string };

export function WorkspaceSwitcher({
  currentScope,
  currentPracticeId,
  hasPlatformAccess,
  practices,
}: {
  currentScope: "PLATFORM" | "PRACTICE";
  currentPracticeId?: string;
  hasPlatformAccess: boolean;
  practices: WorkspaceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const current = currentScope === "PLATFORM"
    ? "Platform Administration"
    : practices.find((practice) => practice.id === currentPracticeId)?.name || "Practice Workspace";

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function choose(scope: "PLATFORM" | "PRACTICE", practiceId?: string) {
    const key = scope === "PLATFORM" ? "platform" : practiceId || "practice";
    setSwitching(key);
    const toastId = toast.loading("Switching workspace…");
    try {
      const response = await fetch("/api/auth/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope === "PLATFORM" ? { scope } : { scope, practiceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Workspace changed", { id: toastId });
      window.location.assign(data.destination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch workspace", { id: toastId });
      setSwitching("");
    }
  }

  if (!hasPlatformAccess && practices.length <= 1) return null;
  return (
    <div className="workspace-switcher" ref={root}>
      <button
        type="button"
        className="workspace-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{current}</span><ChevronsUpDown size={15} />
      </button>
      {open && (
        <div className="workspace-switcher-menu" role="menu" aria-label="Available workspaces">
          {hasPlatformAccess && (
            <button type="button" role="menuitem" disabled={Boolean(switching) || currentScope === "PLATFORM"} onClick={() => choose("PLATFORM")}>
              <ShieldCheck size={17} /><span><b>Platform Administration</b><small>Mondesa platform</small></span>
              {switching === "platform" ? <Loader2 className="toast-spinner" size={15} /> : currentScope === "PLATFORM" && <Check size={15} />}
            </button>
          )}
          {practices.map((practice) => {
            const active = currentScope === "PRACTICE" && practice.id === currentPracticeId;
            return (
              <button type="button" role="menuitem" key={practice.id} disabled={Boolean(switching) || active} onClick={() => choose("PRACTICE", practice.id)}>
                <Building2 size={17} /><span><b>{practice.name}</b><small>Practice workspace</small></span>
                {switching === practice.id ? <Loader2 className="toast-spinner" size={15} /> : active && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
