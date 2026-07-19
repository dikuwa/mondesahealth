"use client";

import { useState } from "react";
import { Bot, Check, ClipboardList, ExternalLink, Loader2, Save, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";

export type ClinicalIntake = {
  id: string;
  originalReason: string;
  approvedSummary: string | null;
  clinicianCorrections: string | null;
  fields: Record<string, string | number | null>;
  questionsSkipped: string[];
  redFlags: string[];
  emergencyNoticeShown: boolean;
  emergencyNoticeAcknowledged: boolean;
  aiConsent: boolean;
  imageConsent: boolean;
  summaryGeneratedAt: string | null;
  patientApprovedAt: string | null;
  consentAt: string | null;
  clinicianReviewedAt: string | null;
  reviewStatus: string;
  messages: { role: string; content: string; skipped: boolean }[];
  images: { id: string; filename: string }[];
};

const requests = [
  ["MISSING_QUESTIONS", "Suggested missing questions"], ["DIFFERENTIALS", "Possible differential considerations"],
  ["EXAMINATION", "Suggested examination areas"], ["INVESTIGATIONS", "Possible investigations"],
  ["DRAFT_NOTES", "Draft consultation notes"], ["SOAP_NOTES", "Draft SOAP notes"], ["ICD10_SEARCH", "ICD-10 search terms"],
].map(([value, label]) => ({ value, label }));

export function ClinicalIntakePanel({ intake, canUseAi, onUpdated }: { intake: ClinicalIntake; canUseAi: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [corrections, setCorrections] = useState(intake.clinicianCorrections || intake.approvedSummary || "");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [requestType, setRequestType] = useState("MISSING_QUESTIONS");
  const [workingDiagnosis, setWorkingDiagnosis] = useState("");
  const [draft, setDraft] = useState<{ id: string; content: string; sourceInformationUsed: string[]; limitations: string[]; icd10SearchTerms: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function update(body: object, success: string) {
    setLoading(true);
    const toastId = toast.loading("Saving clinical intake…");
    try { const response = await fetch("/api/clinical-intake", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: intake.id, ...body }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success(success, { id: toastId }); setEditing(false); onUpdated(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update clinical intake", { id: toastId }); }
    finally { setLoading(false); }
  }

  async function assist() {
    setLoading(true); setDraft(null);
    try { const response = await fetch("/api/clinical-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: intake.id, requestType, workingDiagnosis: workingDiagnosis || undefined }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setDraft(data); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Clinical AI is unavailable"); }
    finally { setLoading(false); }
  }

  const fieldLabels: Record<string, string> = { symptomOnset: "Onset", symptomDuration: "Duration", symptomLocation: "Location", severity: "Severity", symptomPattern: "Pattern", associatedSymptoms: "Associated symptoms", aggravatingFactors: "Worsened by", relievingFactors: "Improved by", treatmentsTried: "Treatment tried", knownAllergies: "Known allergies", existingConditions: "Existing conditions", currentMedication: "Current medication" };
  const facts = Object.entries(intake.fields).filter(([, value]) => value !== null && value !== "");
  const displaySummary = intake.clinicianCorrections || intake.approvedSummary || intake.originalReason;
  const summaryLabel = intake.clinicianCorrections ? "Clinician-edited summary" : intake.approvedSummary ? "Patient-approved summary" : "Booking reason";
  const reviewLabel = intake.reviewStatus === "REVIEWED" ? "Reviewed" : intake.reviewStatus === "EDITED_BY_CLINICIAN" ? "Clinician edited" : "Awaiting review";

  return <section className="clinical-intake-card">
    <div className="clinical-intake-heading">
      <div><span className="eyebrow">Clinical handover</span><h3>Patient intake summary</h3></div>
      <span className="status-badge" data-tone={intake.reviewStatus === "REVIEWED" ? "success" : undefined}>{reviewLabel}</span>
    </div>

    <div className={`clinical-summary-lead${intake.clinicianCorrections ? " is-clinician" : ""}`}>
      <div className="clinical-summary-label"><ClipboardList size={17} aria-hidden="true"/><span>{summaryLabel}</span></div>
      <p>{displaySummary}</p>
      {!intake.approvedSummary && !intake.clinicianCorrections && <small>No patient-approved AI summary was submitted with this booking.</small>}
    </div>

    <div className="clinical-verification-note">
      <ShieldCheck size={18} aria-hidden="true"/>
      <div><b>Patient reported, not clinically verified</b><span>Confirm the history and key details during the consultation.</span></div>
    </div>

    {facts.length > 0 && <section className="clinical-key-details" aria-labelledby={`clinical-key-details-${intake.id}`}>
      <h4 id={`clinical-key-details-${intake.id}`}>Key details reported</h4>
      <dl className="clinical-intake-fields">{facts.map(([key, value]) => <div key={key}><dt>{fieldLabels[key] || key}</dt><dd>{String(value)}{key === "severity" ? "/10" : ""}</dd></div>)}</dl>
    </section>}

    {intake.redFlags.length > 0 && <div className="patient-emergency-notice"><div><b>Urgent notice recorded</b><p>Categories: {intake.redFlags.join(", ")}. Notice {intake.emergencyNoticeAcknowledged ? "acknowledged" : "not acknowledged"}.</p></div></div>}
    {intake.images.length > 0 && <div className="clinical-intake-images">{intake.images.map((image) => <a href={`/api/intake-images/${image.id}`} target="_blank" rel="noreferrer" key={image.id}>{image.filename}<ExternalLink size={14}/></a>)}</div>}

    <details className="clinical-intake-conversation">
      <summary>Original response and consent trail</summary>
      <div className="clinical-source-copy"><b>Original reason for visit</b><p>{intake.originalReason}</p></div>
      {intake.clinicianCorrections && intake.approvedSummary && <div className="clinical-source-copy"><b>Patient-approved version</b><p>{intake.approvedSummary}</p></div>}
      <p>AI consent: {intake.aiConsent ? "Captured" : "Not captured"} · Image consent: {intake.imageConsent ? "Captured" : "Not captured"}</p>
      <p>Consent: {intake.consentAt ? new Date(intake.consentAt).toLocaleString("en-NA") : "Not captured"} · Summary generated: {intake.summaryGeneratedAt ? new Date(intake.summaryGeneratedAt).toLocaleString("en-NA") : "Not generated"} · Patient approved: {intake.patientApprovedAt ? new Date(intake.patientApprovedAt).toLocaleString("en-NA") : "Not approved"} · Clinician reviewed: {intake.clinicianReviewedAt ? new Date(intake.clinicianReviewedAt).toLocaleString("en-NA") : "Not reviewed"}</p>
      {intake.messages.map((message, index) => <p key={index}><b>{message.role === "PATIENT" ? "Patient" : "AI assistant"}:</b> {message.skipped ? "Question skipped" : message.content}</p>)}
      {intake.questionsSkipped.length > 0 && <p><b>Skipped:</b> {intake.questionsSkipped.join("; ")}</p>}
    </details>

    {editing ? <div className="clinical-summary-edit"><label className="field"><span>Clinical summary</span><textarea className="input" value={corrections} onChange={(event) => setCorrections(event.target.value)} maxLength={2000}/></label><div className="patient-ai-actions"><button className="btn btn-light" type="button" onClick={() => setEditing(false)}><X size={15}/> Cancel</button><button className="btn btn-primary" disabled={loading || corrections.trim().length < 10} onClick={() => update({ action: "EDIT_SUMMARY", summary: corrections }, "Clinical summary saved")}><Save size={15}/> Save summary</button></div></div> : <div className="patient-ai-actions clinical-intake-actions"><button className="btn btn-light" type="button" onClick={() => setEditing(true)}>Edit summary</button><button className="btn btn-light" type="button" disabled={loading || intake.reviewStatus === "REVIEWED"} onClick={() => update({ action: "MARK_REVIEWED" }, "Intake marked reviewed")}><Check size={15}/> Mark reviewed</button>{canUseAi && <button className="btn btn-light" type="button" onClick={() => setAssistantOpen((value) => !value)}><Bot size={16}/> Clinical AI assistant</button>}</div>}

    {assistantOpen && <div className="clinical-ai-assistant"><div className="notice-warning"><b>AI-generated assistance for clinician review.</b> It cannot confirm a diagnosis, prescribe, check interactions reliably, finalise notes, or save ICD-10 codes.</div><label className="field"><span>Assistance type</span><CustomSelect value={requestType} onChange={setRequestType} options={requests}/></label>{requestType === "ICD10_SEARCH" && <label className="field"><span>Clinician-entered working or confirmed diagnosis *</span><input className="input" value={workingDiagnosis} onChange={(event) => setWorkingDiagnosis(event.target.value)} placeholder="Required before ICD-10 suggestions"/></label>}<button className="btn btn-primary" type="button" disabled={loading} onClick={assist}>{loading ? <Loader2 className="toast-spinner" size={16}/> : <Bot size={16}/>} Generate for review</button>{draft && <div className="clinical-ai-output"><b>AI-generated consideration · For clinician review</b><textarea className="input" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })}/><p><b>Source information used:</b> {draft.sourceInformationUsed.join("; ")}</p><p><b>Limitations:</b> {draft.limitations.join("; ")}</p>{draft.icd10SearchTerms.length > 0 && <p><b>ICD-10 search terms only:</b> {draft.icd10SearchTerms.join("; ")}. Search and manually select a valid code.</p>}<div className="patient-ai-actions"><button className="btn btn-light" type="button" onClick={() => update({ action: "DISMISS_DRAFT", draftId: draft.id }, "AI draft dismissed")}>Dismiss</button><button className="btn btn-primary" type="button" onClick={() => update({ action: "ACCEPT_DRAFT", draftId: draft.id, content: draft.content }, "AI output accepted as an unsigned draft")}>Accept as draft</button></div></div>}</div>}
  </section>;
}
