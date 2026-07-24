"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

type ChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
  note: string | null;
  completedById: string | null;
  completedAt: string | null;
};

export function VerificationChecklist({
  applicationId,
}: {
  applicationId: string;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(
          `/api/provider-applications/checklist?applicationId=${encodeURIComponent(applicationId)}`,
        );
        if (!response.ok) throw new Error("Failed to load checklist");
        const data = await response.json();
        if (cancelled) return;
        setItems(data.items);
        const noteMap: Record<string, string> = {};
        for (const item of data.items) {
          if (item.note) noteMap[item.key] = item.note;
        }
        setNotes(noteMap);
      } catch {
        if (!cancelled) toast.error("Could not load verification checklist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function toggleItem(key: string) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, completed: !item.completed } : item,
      ),
    );
  }

  function updateNote(key: string, value: string) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  async function saveChecklist() {
    setSaving(true);
    const toastId = toast.loading("Saving checklist…");
    try {
      const response = await fetch("/api/provider-applications/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          items: items.map((item) => ({
            item: item.key,
            completed: item.completed,
            note: notes[item.key] || undefined,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      toast.success("Checklist saved", { id: toastId });
    } catch {
      toast.error("Could not save checklist", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  const completedCount = items.filter((i) => i.completed).length;

  if (loading) {
    return (
      <div className="checklist-loading">
        <Loader2 className="toast-spinner" size={18} />
        Loading checklist…
      </div>
    );
  }

  return (
    <div className="verification-checklist">
      <div className="verification-checklist-header">
        <h4>Verification checklist</h4>
        <span className="checklist-progress">
          {completedCount} of {items.length} complete
        </span>
      </div>
      <div className="checklist-items">
        {items.map((item) => (
          <div
            key={item.key}
            className={`checklist-item ${item.completed ? "completed" : ""}`}
          >
            <button
              type="button"
              className="checklist-toggle"
              onClick={() => toggleItem(item.key)}
              aria-label={
                item.completed
                  ? `Mark "${item.label}" as incomplete`
                  : `Mark "${item.label}" as complete`
              }
            >
              {item.completed ? (
                <CheckCircle2 size={20} className="checklist-checked" />
              ) : (
                <Circle size={20} className="checklist-unchecked" />
              )}
            </button>
            <div className="checklist-item-content">
              <label
                className="checklist-item-label"
                onClick={() => toggleItem(item.key)}
              >
                {item.label}
              </label>
              <input
                className="input checklist-note-input"
                type="text"
                placeholder="Optional note…"
                value={notes[item.key] ?? ""}
                onChange={(event) => updateNote(item.key, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="checklist-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={saveChecklist}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="toast-spinner" size={15} />
          ) : (
            <Save size={15} />
          )}
          Save checklist
        </button>
      </div>
    </div>
  );
}
