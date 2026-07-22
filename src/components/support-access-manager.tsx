"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";

type Grant = {
  id: string;
  practice: string;
  patientNumber: string;
  reason: string;
  expiresAt: string;
  revokedAt: string | null;
};

export function SupportAccessManager({
  practices,
  grants,
}: {
  practices: { id: string; name: string }[];
  grants: Grant[];
}) {
  const router = useRouter();
  const [practiceId, setPracticeId] = useState(practices[0]?.id || "");
  const [duration, setDuration] = useState("15");
  const [saving, setSaving] = useState(false);
  const [revoke, setRevoke] = useState<Grant | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const id = toast.loading("Creating restricted support grant…");
    try {
      const response = await fetch("/api/platform/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceId,
          patientNumber: form.get("patientNumber"),
          reason: form.get("reason"),
          durationMinutes: Number(duration),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Time-limited support access granted", { id });
      router.push(`/platform/support/${data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create support grant", { id });
    } finally {
      setSaving(false);
    }
  }

  async function confirmRevoke() {
    if (!revoke) return;
    setSaving(true);
    const id = toast.loading("Revoking support access…");
    try {
      const response = await fetch(`/api/platform/support?id=${revoke.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Support access revoked", { id });
      setRevoke(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke access", { id });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="card dashboard-card panel-card support-request-card" onSubmit={create}>
        <div className="panel-heading">
          <div>
            <h2>Request exceptional support access</h2>
            <p>Use only for a documented support case. Access is patient-specific, read-only, time-limited, and audited.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label className="field">
              <span>Practice</span>
              <CustomSelect value={practiceId} onChange={setPracticeId} options={practices.map((item) => ({ value: item.id, label: item.name }))} />
            </label>
            <label className="field">
              <span>Exact patient reference</span>
              <input className="input" name="patientNumber" autoComplete="off" required />
            </label>
            <label className="field">
              <span>Duration</span>
              <CustomSelect value={duration} onChange={setDuration} options={[5, 15, 30, 60].map((minutes) => ({ value: String(minutes), label: `${minutes} minutes` }))} />
            </label>
            <label className="field field-span-2">
              <span>Documented reason</span>
              <textarea className="input" name="reason" rows={4} minLength={10} required />
            </label>
          </div>
        </div>
        <div className="panel-actions">
          <button className="btn btn-primary" disabled={saving || !practiceId}>{saving ? "Creating…" : "Create access grant"}</button>
        </div>
      </form>

      <section className="card dashboard-card panel-card">
        <div className="panel-heading"><div><h2>Recent grants</h2><p>Active, expired, and revoked grants remain visible for audit purposes.</p></div></div>
        <div className="record-stack">
          {grants.map((grant) => {
            const active = !grant.revokedAt && new Date(grant.expiresAt) > new Date();
            const status = grant.revokedAt ? "REVOKED" : active ? "ACTIVE" : "EXPIRED";
            return (
              <article className="record-row" key={grant.id}>
                <div>
                  <div className="record-row-title"><b>{grant.practice} · {grant.patientNumber}</b><StatusBadge value={status} /></div>
                  <p>{grant.reason}</p>
                  <small>Expires {new Date(grant.expiresAt).toLocaleString("en-NA")}</small>
                </div>
                {active && <div className="table-actions"><a className="btn btn-light" href={`/platform/support/${grant.id}`}>Open read-only</a><button className="btn btn-light" type="button" onClick={() => setRevoke(grant)}>Revoke</button></div>}
              </article>
            );
          })}
          {!grants.length && <div className="dashboard-empty"><h3>No support grants yet</h3><p>Patient-specific grants will appear here after they are created.</p></div>}
        </div>
      </section>
      <ConfirmationDialog open={Boolean(revoke)} title="Revoke support access?" description="The patient-specific support grant will stop working immediately." confirmLabel="Revoke access" danger busy={saving} onCancel={() => setRevoke(null)} onConfirm={confirmRevoke} />
    </>
  );
}
