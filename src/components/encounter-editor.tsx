"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Icd10Search } from "@/components/icd10-search";
import { CustomSelect } from "@/components/ui/custom-select";

type Diagnosis = { code?: string | null; description: string; clinicianDescription?: string | null; diagnosisType: string; isPrimary: boolean; summaryDisposition: string };

type Encounter = {
  id?: string;
  patientId: string;
  appointmentId?: string;
  status?: string;
  presentingComplaint?: string | null;
  patientReportedHistory?: string | null;
  aiBookingSummary?: string | null;
  historyPresentIllness?: string | null;
  relevantHistory?: string | null;
  examinationFindings?: string | null;
  clinicalObservations?: string | null;
  assessment?: string | null;
  provisionalDiagnosis?: string | null;
  confirmedDiagnosis?: string | null;
  treatmentProvided?: string | null;
  medicationPrescribed?: string | null;
  proceduresPerformed?: string | null;
  testsRequested?: string | null;
  referrals?: string | null;
  followUpInstructions?: string | null;
  patientSummary?: string | null;
  privateNotes?: string | null;
  allergiesReviewed?: boolean;
  medicationReviewed?: boolean;
  diagnoses?: Diagnosis[];
};
const inputs: [keyof Encounter, string, string][] = [
  ["presentingComplaint", "Presenting complaint", "Reported by patient"],
  [
    "patientReportedHistory",
    "Patient-reported history",
    "Keep the patient's original wording distinct from clinical conclusions",
  ],
  [
    "historyPresentIllness",
    "History of present illness",
    "Clinician-documented history",
  ],
  [
    "relevantHistory",
    "Relevant medical history",
    "Relevant conditions, procedures and context",
  ],
  [
    "examinationFindings",
    "Physical examination findings",
    "Objective examination findings",
  ],
  ["clinicalObservations", "Clinical observations", "Clinician observation"],
  ["assessment", "Assessment", "Clinical assessment and reasoning"],
  [
    "provisionalDiagnosis",
    "Provisional diagnosis",
    "Working diagnosis, not yet confirmed",
  ],
  [
    "confirmedDiagnosis",
    "Confirmed diagnosis",
    "Clinician-confirmed diagnosis",
  ],
  [
    "treatmentProvided",
    "Treatment provided",
    "Treatment delivered during this encounter",
  ],
  [
    "medicationPrescribed",
    "Medication prescribed",
    "Medicine, dose, route and instructions",
  ],
  ["proceduresPerformed", "Procedures performed", "Procedures completed"],
  [
    "testsRequested",
    "Tests, laboratory or imaging requests",
    "Requested investigations",
  ],
  ["referrals", "Referrals", "Referral details"],
  [
    "followUpInstructions",
    "Follow-up instructions",
    "Clinical plan and follow-up",
  ],
  [
    "patientSummary",
    "Patient-facing summary",
    "Plain-language summary for the patient",
  ],
  [
    "privateNotes",
    "Internal private clinical notes",
    "Visible only to authorised clinical roles",
  ],
];
export function EncounterEditor({
  initial,
  patientName,
}: {
  initial: Encounter;
  patientName: string;
}) {
  const router = useRouter(),
    [saving, setSaving] = useState(false),
    [complete, setComplete] = useState(false),
    [amend, setAmend] = useState(false),
    [amendReason, setAmendReason] = useState(""),
    [editingAmend, setEditingAmend] = useState(false),
    [diagnoses, setDiagnoses] = useState<Diagnosis[]>(initial.diagnoses || []);
  const completed = ["COMPLETED", "AMENDED"].includes(initial.status || "");
  async function save(
    action: "SAVE_DRAFT" | "COMPLETE" | "AMEND",
    reason?: string,
  ) {
    const form = document.querySelector<HTMLFormElement>("#encounter-form");
    if (!form) return;
    setSaving(true);
    const toastId = toast.loading(
      action === "COMPLETE"
        ? "Completing consultation…"
        : "Saving consultation…",
    );
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/encounters", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          id: initial.id,
          patientId: initial.patientId,
          appointmentId: initial.appointmentId,
          action,
          amendmentReason: reason,
          allergiesReviewed: data.allergiesReviewed === "on",
          medicationReviewed: data.medicationReviewed === "on",
          diagnoses,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(
        action === "COMPLETE"
          ? "Consultation completed"
          : action === "AMEND"
            ? "Amendment recorded"
            : "Draft saved",
        { id: toastId },
      );
      router.push(`/dashboard/encounters/${result.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save consultation",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <form id="encounter-form" className="encounter-form">
        <section className="card dashboard-card">
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow">Clinical encounter</span>
              <h2>{patientName}</h2>
            </div>
            {initial.status && (
              <span className="status-badge">{initial.status}</span>
            )}
          </div>
          {initial.aiBookingSummary && (
            <div className="notice-info">
              <b>AI-assisted summary</b>
              <p>{initial.aiBookingSummary}</p>
              <small>
                AI-generated draft. Review and approve before saving to the
                clinical record.
              </small>
            </div>
          )}
          <div className="form-grid">
            {inputs.map(([name, label, hint]) => (
              <label
                className={name === "privateNotes" ? "field-span-2" : ""}
                key={name}
              >
                <span>{label}</span>
                <textarea
                  className="input"
                  name={name}
                  defaultValue={String(initial[name] || "")}
                  placeholder={hint}
                  disabled={completed && !editingAmend}
                />
              </label>
            ))}
          </div>
          <section className="encounter-diagnoses">
            <div className="dashboard-section-heading"><div><h3>Structured diagnoses</h3><p className="muted">Search the verified ICD-10 dataset, then confirm type and long-term summary handling.</p></div></div>
            <div className="code-badges">{diagnoses.map((diagnosis, index) => <article className={diagnosis.isPrimary ? "is-primary" : ""} key={`${diagnosis.code}-${index}`}><div><b>{diagnosis.code || "No code"} · {diagnosis.description}</b><small>{diagnosis.isPrimary ? "Primary" : "Supporting"} · {diagnosis.diagnosisType.toLowerCase()}</small></div>{(!completed || editingAmend) && <button type="button" className="icon-action" aria-label={`Remove ${diagnosis.code || diagnosis.description}`} onClick={() => setDiagnoses((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15}/></button>}<CustomSelect ariaLabel="Diagnosis type" value={diagnosis.diagnosisType} disabled={completed && !editingAmend} onChange={(value) => setDiagnoses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, diagnosisType: value } : item))} options={[{value:"PROVISIONAL",label:"Provisional"},{value:"CONFIRMED",label:"Confirmed"}]}/><CustomSelect ariaLabel="Medical summary action" value={diagnosis.summaryDisposition} disabled={completed && !editingAmend} onChange={(value) => setDiagnoses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, summaryDisposition: value } : item))} options={[{value:"DO_NOT_ADD",label:"Do not add to summary"},{value:"ACTIVE",label:"Add to active conditions"},{value:"HISTORICAL",label:"Add to historical conditions"}]}/></article>)}</div>
            {(!completed || editingAmend) && <div className="icd-pickers"><Icd10Search primary onChoose={(code) => setDiagnoses((current) => current.some((item) => item.code === code.code) ? current : [...current.map((item) => ({ ...item, isPrimary: false })), { code: code.code, description: code.description, diagnosisType: "CONFIRMED", isPrimary: true, summaryDisposition: "DO_NOT_ADD" }])}/><Icd10Search primary={false} onChoose={(code) => setDiagnoses((current) => current.some((item) => item.code === code.code) ? current : [...current, { code: code.code, description: code.description, diagnosisType: "PROVISIONAL", isPrimary: false, summaryDisposition: "DO_NOT_ADD" }])}/></div>}
          </section>
          <div className="check-row">
            <label>
              <input
                type="checkbox"
                name="allergiesReviewed"
                defaultChecked={initial.allergiesReviewed}
                disabled={completed && !editingAmend}
              />{" "}
              Allergies reviewed
            </label>
            <label>
              <input
                type="checkbox"
                name="medicationReviewed"
                defaultChecked={initial.medicationReviewed}
                disabled={completed && !editingAmend}
              />{" "}
              Current medication reviewed
            </label>
          </div>
          <div className="form-actions">
            {!completed && (
              <>
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={saving}
                  onClick={() => save("SAVE_DRAFT")}
                >
                  <Save size={16} />
                  {saving ? (
                    <Loader2 className="toast-spinner" />
                  ) : (
                    "Save draft"
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => setComplete(true)}
                >
                  <CheckCircle2 size={16} /> Complete consultation
                </button>
              </>
            )}
            {completed && !editingAmend && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditingAmend(true)}
              >
                Amend completed record
              </button>
            )}
            {completed && editingAmend && (
              <>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setEditingAmend(false)}
                >
                  Cancel amendment
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setAmend(true)}
                >
                  Record amendment
                </button>
              </>
            )}
          </div>
        </section>
      </form>
      <ConfirmationDialog
        open={complete}
        title="Complete consultation?"
        description="The encounter will become immutable. Later corrections require a reasoned amendment."
        confirmLabel="Complete encounter"
        onCancel={() => setComplete(false)}
        onConfirm={() => {
          setComplete(false);
          save("COMPLETE");
        }}
      />
      <PromptDialog
        open={amend}
        title="Amend completed encounter"
        description="Explain why this clinical record is being corrected. The original content will be retained."
        label="Amendment reason"
        value={amendReason}
        onChange={setAmendReason}
        confirmLabel="Record amendment"
        onCancel={() => setAmend(false)}
        onConfirm={() => {
          setAmend(false);
          save("AMEND", amendReason);
        }}
      />
    </>
  );
}
