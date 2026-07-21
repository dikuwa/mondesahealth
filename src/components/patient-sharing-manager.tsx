"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Share2, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  PATIENT_SHARE_CONSENT_STATEMENT,
  PATIENT_SHARE_SCOPE_LABELS,
  PATIENT_SHARE_SCOPES,
  type PatientShareScope,
} from "@/lib/patient-sharing";

type Consent = {
  id: string;
  destinationPractice: string;
  scopes: PatientShareScope[];
  status: string;
  expiresAt: string;
  revokedAt: string | null;
};

export function PatientSharingManager({
  patientId,
  patientName,
  destinations,
  consents,
}: {
  patientId: string;
  patientName: string;
  destinations: { id: string; name: string; town: string | null }[];
  consents: Consent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destinationPracticeId, setDestinationPracticeId] = useState("");
  const [scopes, setScopes] = useState<PatientShareScope[]>(["SUMMARY"]);
  const [consentMethod, setConsentMethod] = useState("IN_PERSON");
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().slice(0, 10);
  });
  const [minimumExpiry] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<Consent | null>(null);
  const [revocationReason, setRevocationReason] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const toastId = toast.loading("Recording sharing consent…");
    try {
      const response = await fetch("/api/patient-sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          destinationPracticeId,
          scopes,
          patientOrGuardianName: form.get("patientOrGuardianName"),
          relationshipToPatient: form.get("relationshipToPatient"),
          consentMethod,
          expiresAt: `${expiresAt}T23:59:59.999Z`,
          consentConfirmed: confirmed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Consent recorded and shared access enabled", {
        id: toastId,
      });
      setOpen(false);
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not record consent",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  async function revoke() {
    if (!revoking) return;
    setSaving(true);
    const toastId = toast.loading("Revoking shared access…");
    try {
      const response = await fetch("/api/patient-sharing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: revoking.id,
          action: "REVOKE",
          reason: revocationReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Shared access revoked", { id: toastId });
      setRevoking(null);
      setRevocationReason("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke access",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card dashboard-card patient-sharing-card">
      <div className="manager-toolbar">
        <div>
          <h2>Consent-based practice sharing</h2>
          <p>Read-only, scoped, expiring and auditable access.</p>
        </div>
        <button
          className="btn btn-light"
          type="button"
          onClick={() => setOpen(true)}
          disabled={!destinations.length}
        >
          <Share2 size={16} /> Share by consent
        </button>
      </div>
      <div className="record-stack">
        {consents.map((consent) => {
          const active =
            consent.status === "ACTIVE" &&
            !consent.revokedAt &&
            new Date(consent.expiresAt) > new Date();
          return (
            <article className="record-row" key={consent.id}>
              <div>
                <b>{consent.destinationPractice}</b>
                <small>
                  {consent.scopes
                    .map((scope) => PATIENT_SHARE_SCOPE_LABELS[scope])
                    .join(" · ")} {" "}
                  · {active ? "Active until" : "Ended"}{" "}
                  {new Date(consent.expiresAt).toLocaleDateString("en-NA")}
                </small>
              </div>
              {active && (
                <button
                  className="btn btn-light"
                  onClick={() => setRevoking(consent)}
                >
                  Revoke
                </button>
              )}
            </article>
          );
        })}
        {!consents.length && (
          <div className="dashboard-empty">No sharing consents recorded.</div>
        )}
      </div>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close sharing consent form"
            onClick={() => setOpen(false)}
          />
          <form className="appointment-panel" onSubmit={create}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Explicit patient consent</span>
                <h2>Share {patientName}</h2>
                <p>No patient data is copied or merged between practices.</p>
              </div>
              <button
                type="button"
                aria-label="Close sharing consent form"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="appointment-form-grid">
              <label className="field dashboard-span-all">
                <span>Destination practice</span>
                <CustomSelect
                  value={destinationPracticeId}
                  onChange={setDestinationPracticeId}
                  options={[
                    { value: "", label: "Select a practice" },
                    ...destinations.map((practice) => ({
                      value: practice.id,
                      label: `${practice.name}${practice.town ? ` · ${practice.town}` : ""}`,
                    })),
                  ]}
                />
              </label>
              <fieldset className="field dashboard-span-all service-template-picker">
                <legend>Information the destination may view</legend>
                <div className="checkbox-grid">
                  {PATIENT_SHARE_SCOPES.map((scope) => (
                    <label className="toggle-label" key={scope}>
                      <input
                        type="checkbox"
                        checked={scopes.includes(scope)}
                        onChange={(event) =>
                          setScopes((current) =>
                            event.target.checked
                              ? [...current, scope]
                              : current.filter((item) => item !== scope),
                          )
                        }
                      />
                      <span>{PATIENT_SHARE_SCOPE_LABELS[scope]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span>Patient or guardian name</span>
                <input
                  className="input"
                  name="patientOrGuardianName"
                  defaultValue={patientName}
                  required
                />
              </label>
              <label className="field">
                <span>Relationship to patient</span>
                <input
                  className="input"
                  name="relationshipToPatient"
                  placeholder="Self, parent, legal guardian…"
                />
              </label>
              <label className="field">
                <span>Consent method</span>
                <CustomSelect
                  value={consentMethod}
                  onChange={setConsentMethod}
                  options={[
                    { value: "IN_PERSON", label: "In person" },
                    { value: "SIGNED_FORM", label: "Signed form" },
                    { value: "VERBAL_RECORDED", label: "Recorded verbal consent" },
                  ]}
                />
              </label>
              <label className="field">
                <span>Access expires</span>
                <DatePicker
                  value={expiresAt}
                  onChange={setExpiresAt}
                  min={minimumExpiry}
                />
              </label>
              <div className="consent-statement dashboard-span-all">
                <ShieldCheck size={20} />
                <p>{PATIENT_SHARE_CONSENT_STATEMENT}</p>
              </div>
              <label className="toggle-label dashboard-span-all">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I confirm that explicit consent was obtained and recorded
                  using the method above.
                </span>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  saving ||
                  !destinationPracticeId ||
                  !scopes.length ||
                  !confirmed
                }
              >
                {saving ? <Loader2 className="toast-spinner" size={16} /> : <Share2 size={16} />}
                Enable read-only access
              </button>
            </div>
          </form>
        </div>
      )}
      <PromptDialog
        open={Boolean(revoking)}
        title="Revoke shared patient access?"
        description="The destination practice will immediately lose access. Previous access logs remain preserved."
        label="Reason for revocation"
        value={revocationReason}
        onChange={setRevocationReason}
        confirmLabel="Revoke access"
        danger
        busy={saving}
        onCancel={() => setRevoking(null)}
        onConfirm={revoke}
      />
    </section>
  );
}
