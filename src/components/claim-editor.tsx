"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Icd10Search } from "@/components/icd10-search";
import { StatusBadge } from "@/components/ui/status-badge";

type Code = { id: string; code: string; description: string; isPrimary: boolean; sortOrder: number };
type Line = {
  id?: string;
  serviceDate: string;
  procedureItemId: string;
  tariffCode: string;
  description: string;
  quantity: number;
  rate: number;
  modifier: string;
  nappiCode: string;
  preAuthorisationNumber: string;
  diagnoses: Code[];
};
type ValidationMessage = { level: "ERROR" | "WARNING" | "INFO"; field: string; message: string };
type Attachment = { id: string; filename: string; attachmentType: string };
type Props = {
  claim: {
    id: string; claimNumber: string; status: string; claimType: string; serviceDateFrom: string;
    serviceDateTo: string; practitioner: string; internalNotes: string; patient: string; patientId: string;
    patientMedicalAidId: string; medicalAidFundId: string; validationState: string | null; amount: number;
    isResubmission: boolean;
  };
  memberships: { id: string; fundId: string; label: string }[];
  funds: { id: string; name: string }[];
  procedures: { id: string; code: string; name: string; amount: number; requiresNappiCode: boolean; requiresPreAuthorisation: boolean }[];
  initialLines: Line[];
  history: { status: string; reason: string | null; date: string }[];
  attachments: Attachment[];
};

const blank = (serviceDate: string): Line => ({
  serviceDate, procedureItemId: "", tariffCode: "", description: "", quantity: 1, rate: 0,
  modifier: "", nappiCode: "", preAuthorisationNumber: "", diagnoses: [],
});

export function ClaimEditor({ claim, memberships, funds, procedures, initialLines, history, attachments }: Props) {
  const router = useRouter();
  const [membership, setMembership] = useState(claim.patientMedicalAidId);
  const [fund, setFund] = useState(claim.medicalAidFundId);
  const [claimType, setClaimType] = useState(claim.claimType);
  const [from, setFrom] = useState(claim.serviceDateFrom);
  const [to, setTo] = useState(claim.serviceDateTo);
  const [practitioner, setPractitioner] = useState(claim.practitioner);
  const [notes, setNotes] = useState(claim.internalNotes);
  const [lines, setLines] = useState(initialLines.length ? initialLines : [blank(claim.serviceDateFrom)]);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationMessage[]>(claim.validationState ? JSON.parse(claim.validationState) : []);
  const [outcomeState, setOutcomeState] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
  const [outcomeAmount, setOutcomeAmount] = useState(String(claim.amount));
  const [approvedAmount, setApprovedAmount] = useState(String(claim.amount));
  const [patientResponsibility, setPatientResponsibility] = useState("0");
  const [remittanceReference, setRemittanceReference] = useState("");
  const [outcomeDate, setOutcomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [rejectionCode, setRejectionCode] = useState("");
  const [rejectionDescription, setRejectionDescription] = useState("");
  const [attachmentList, setAttachmentList] = useState(attachments);
  const [attachmentType, setAttachmentType] = useState("CLINICAL_SUPPORT");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState("claim-details");
  const locked = ["SUBMITTED", "ACKNOWLEDGED", "PARTIALLY_PAID", "PAID", "REJECTED", "RESUBMITTED"].includes(claim.status);
  const total = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.rate), 0);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".claim-section[id]"));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
    }, { root: document.querySelector(".dashboard-content"), rootMargin: "-92px 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function update(index: number, value: Partial<Line>) {
    setLines((current) => current.map((line, position) => position === index ? { ...line, ...value } : line));
  }

  function chooseProcedure(index: number, id: string) {
    const item = procedures.find((value) => value.id === id);
    update(index, { procedureItemId: id, tariffCode: item?.code || "", description: item?.name || "", rate: item?.amount || 0 });
  }

  function chooseMembership(value: string) {
    setMembership(value);
    const selectedMembership = memberships.find((item) => item.id === value);
    setFund(selectedMembership?.fundId || "");
    if (selectedMembership) toast.success(`Selected ${selectedMembership.label}`);
  }

  function addCode(index: number, code: { id: string; code: string; description: string }, primary: boolean) {
    setLines((current) => current.map((line, position) => position !== index ? line : {
      ...line,
      diagnoses: [
        ...(primary ? line.diagnoses.filter((value) => !value.isPrimary) : line.diagnoses).filter((value) => value.id !== code.id),
        { ...code, isPrimary: primary, sortOrder: primary ? 0 : line.diagnoses.length + 1 },
      ],
    }));
  }

  async function request(body: object, message: string) {
    setSaving(true);
    const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/claims", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(message.replace("…", ""), { id: toastId });
      router.refresh();
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim action failed", { id: toastId });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    return request({
      action: "SAVE", id: claim.id, patientMedicalAidId: membership, medicalAidFundId: fund, claimType,
      serviceDateFrom: from, serviceDateTo: to, practitioner, internalNotes: notes || null,
      lines: lines.map((line, sortOrder) => ({
        ...line, procedureItemId: line.procedureItemId || null, modifier: line.modifier || null,
        nappiCode: line.nappiCode || null, preAuthorisationNumber: line.preAuthorisationNumber || null, sortOrder,
        diagnoses: line.diagnoses.map((code, diagnosisOrder) => ({ icd10CodeId: code.id, isPrimary: code.isPrimary, sortOrder: diagnosisOrder })),
      })),
    }, "Saving claim…");
  }

  async function validate() {
    if (!await save()) return;
    const result = await request({ action: "VALIDATE", id: claim.id }, "Validating claim…");
    if (result) setValidation(result.messages || []);
  }

  function openOutcome(status: string) {
    setOutcomeState(status);
    setOutcomeReason("");
    setOutcomeAmount(String(claim.amount));
    setApprovedAmount(String(claim.amount));
    setPatientResponsibility("0");
    setRemittanceReference("");
    setOutcomeDate(new Date().toISOString().slice(0, 10));
    setRejectionCode("");
    setRejectionDescription("");
  }

  async function submitOutcome() {
    if (!outcomeState || !outcomeReason.trim()) return;
    const result = await request({
      action: "OUTCOME", id: claim.id, status: outcomeState, reason: outcomeReason.trim(),
      amountPaid: outcomeState.includes("PAID") ? Number(outcomeAmount) : undefined,
      amountApproved: outcomeState.includes("PAID") ? Number(approvedAmount) : undefined,
      patientResponsibility: outcomeState.includes("PAID") ? Number(patientResponsibility) : undefined,
      remittanceReference: remittanceReference.trim() || undefined,
      paymentDate: outcomeState.includes("PAID") ? outcomeDate : undefined,
      rejectionCode: rejectionCode.trim() || undefined,
      rejectionDescription: rejectionDescription.trim() || undefined,
    }, "Recording outcome…");
    if (result) setOutcomeState(null);
  }

  async function uploadAttachment() {
    if (!attachmentFile) return;
    setSaving(true);
    const toastId = toast.loading("Uploading protected attachment…");
    try {
      const form = new FormData();
      form.set("claimId", claim.id);
      form.set("attachmentType", attachmentType);
      form.set("file", attachmentFile);
      const response = await fetch("/api/claim-attachments", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAttachmentList((current) => [...current, { id: data.id, filename: data.filename, attachmentType }]);
      setAttachmentFile(null);
      toast.success("Attachment stored privately", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attachment upload failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="claim-editor">
      <div className="claim-editor-toolbar">
        <div><StatusBadge value={claim.status} /><p>{claim.patient} · {claim.claimNumber}{claim.isResubmission ? " · Resubmission" : ""}</p></div>
        <div className="manager-actions">
          <a className="btn btn-light" target="_blank" href={`/api/claim-documents/${claim.id}?type=claim`}><FileDown size={16} />Preview statement</a>
          {!locked && <><button className="btn btn-light" disabled={saving} onClick={save}><Save size={16} />Save draft</button><button className="btn btn-primary" disabled={saving} onClick={validate}>{saving ? <Loader2 className="toast-spinner" size={16} /> : <CheckCircle2 size={16} />}Validate</button></>}
        </div>
      </div>
      <nav className="claim-section-nav" aria-label="Claim sections">{[["claim-details", "Claim details"], ["claim-lines", "Claim lines"], ["claim-attachments", "Attachments"], ["claim-validation", "Validation"], ["claim-history", "History"]].map(([id, label]) => <a className={activeSection === id ? "is-active" : ""} aria-current={activeSection === id ? "location" : undefined} href={`#${id}`} key={id} onClick={() => setActiveSection(id)}>{label}</a>)}</nav>
      <section id="claim-details" className="card dashboard-card claim-section">
        <h2>Patient and claim details</h2>
        <div className="claim-form-grid">
          <label className="field"><span>Medical-aid membership</span><CustomSelect value={membership} onChange={chooseMembership} disabled={locked || !memberships.length} placeholder={memberships.length ? "Select membership" : "No memberships available"} options={[{ value: "", label: "Select membership" }, ...memberships.map((item) => ({ value: item.id, label: item.label }))]} />{membership && <small>Linked fund: {funds.find((item) => item.id === fund)?.name || "Not selected"}</small>}</label>
          <label className="field"><span>Medical-aid fund</span><CustomSelect value={fund} onChange={setFund} disabled={locked} placeholder="Select fund" options={[{ value: "", label: "Select fund" }, ...funds.map((item) => ({ value: item.id, label: item.name }))]} />{!fund && <small>Selecting a membership fills this automatically.</small>}</label>
          <label className="field"><span>Claim type</span><CustomSelect value={claimType} onChange={setClaimType} disabled={locked} options={[{ value: "DIRECT_MEDICAL_AID", label: "Direct medical aid" }, { value: "PATIENT_REIMBURSEMENT", label: "Patient reimbursement" }]} /></label>
          <label className="field"><span>Treating provider</span><input className="input" value={practitioner} onChange={(event) => setPractitioner(event.target.value)} disabled={locked} /></label>
          <label className="field"><span>Service date from</span><DatePicker value={from} onChange={setFrom} disabled={locked} /></label>
          <label className="field"><span>Service date to</span><DatePicker value={to} onChange={setTo} disabled={locked} /></label>
          <label className="field claim-wide"><span>Internal notes</span><textarea className="input" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={locked} /></label>
        </div>
      </section>
      <section id="claim-lines" className="claim-section">
        <div className="manager-toolbar"><div><h2>Claim lines</h2><p>Totals are recalculated and verified on the server.</p></div>{!locked && <button className="btn btn-light" onClick={() => setLines((current) => [...current, blank(from)])}><Plus size={16} />Add line</button>}</div>
        <div className="claim-lines">{lines.map((line, index) => <article className="card dashboard-card claim-line" key={line.id || index}>
          <div className="claim-line-heading"><b>Line {index + 1}</b>{!locked && lines.length > 1 && <button className="icon-action danger-action" aria-label={`Remove line ${index + 1}`} onClick={() => setLines((current) => current.filter((_, position) => position !== index))}><Trash2 size={16} /></button>}</div>
          <div className="claim-form-grid">
            <label className="field"><span>Service date</span><DatePicker value={line.serviceDate} onChange={(value) => update(index, { serviceDate: value })} disabled={locked} /></label>
            <label className="field"><span>Procedure item</span><CustomSelect value={line.procedureItemId} onChange={(value) => chooseProcedure(index, value)} disabled={locked} options={[{ value: "", label: "Manual procedure" }, ...procedures.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))]} /></label>
            <label className="field"><span>Procedure code</span><input className="input" value={line.tariffCode} onChange={(event) => update(index, { tariffCode: event.target.value })} disabled={locked} /></label>
            <label className="field"><span>Description</span><input className="input" value={line.description} onChange={(event) => update(index, { description: event.target.value })} disabled={locked} /></label>
            <label className="field"><span>Quantity</span><input className="input" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} disabled={locked} /></label>
            <label className="field"><span>Unit amount (NAD)</span><input className="input" type="number" min="0.01" step="0.01" value={line.rate} onChange={(event) => update(index, { rate: Number(event.target.value) })} disabled={locked} /></label>
            <label className="field"><span>Modifier (optional)</span><input className="input" value={line.modifier} onChange={(event) => update(index, { modifier: event.target.value })} disabled={locked} /></label>
            <label className="field"><span>NAPPI code (when required)</span><input className="input" value={line.nappiCode} onChange={(event) => update(index, { nappiCode: event.target.value })} disabled={locked} /></label>
            <label className="field claim-wide"><span>Pre-authorisation number (when required)</span><input className="input" value={line.preAuthorisationNumber} onChange={(event) => update(index, { preAuthorisationNumber: event.target.value })} disabled={locked} /></label>
            <div className="field claim-wide"><span>ICD-10 diagnosis codes</span><div className="code-badges">{line.diagnoses.map((code) => <button type="button" disabled={locked} key={code.id} onClick={() => update(index, { diagnoses: line.diagnoses.filter((value) => value.id !== code.id) })} className={code.isPrimary ? "is-primary" : ""}><b>{code.code}</b>{code.isPrimary ? "Primary" : "Secondary"}</button>)}</div>{!locked && <div className="icd-pickers"><Icd10Search primary onChoose={(code) => addCode(index, code, true)} /><Icd10Search primary={false} onChoose={(code) => addCode(index, code, false)} /></div>}</div>
          </div>
          <div className="claim-line-total">Line total <b>N$ {(line.quantity * line.rate).toFixed(2)}</b></div>
        </article>)}</div>
        <div className="claim-total">Total claim amount <b>N$ {total.toFixed(2)}</b></div>
      </section>
      <section id="claim-attachments" className="card dashboard-card claim-section">
        <div className="manager-toolbar"><div><h2>Supporting attachments</h2><p>PDF, JPG and PNG files are stored privately and require claim permissions.</p></div></div>
        <div className="claim-attachment-list">{attachmentList.map((attachment) => <a className="btn btn-light" target="_blank" href={`/api/claim-attachments?id=${attachment.id}`} key={attachment.id}><FileDown size={15} />{attachment.attachmentType.replaceAll("_", " ")} · {attachment.filename}</a>)}{!attachmentList.length && <p className="muted">No supporting documents have been added.</p>}</div>
        <div className="claim-attachment-upload">
          <label className="field"><span>Attachment type</span><CustomSelect value={attachmentType} onChange={setAttachmentType} options={["REFERRAL", "PRE_AUTHORISATION", "CLINICAL_SUPPORT", "REMITTANCE", "REJECTION_NOTICE", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /></label>
          <label className="field"><span>Choose file</span><input className="input" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} /></label>
          <button className="btn btn-light" disabled={saving || !attachmentFile} onClick={uploadAttachment}>{saving && <Loader2 className="toast-spinner" size={16} />}Upload securely</button>
        </div>
      </section>
      <section id="claim-validation" className="card dashboard-card claim-section"><h2>Validation</h2>{validation.length ? <div className="validation-list">{validation.map((item, index) => <div className={`validation-${item.level.toLowerCase()}`} key={`${item.field}-${index}`}>{item.level === "ERROR" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}<div><b>{item.level}</b><p>{item.message}</p></div></div>)}</div> : <p className="muted">Save and validate the claim to see errors, warnings and information.</p>}</section>
      <section id="claim-history" className="card dashboard-card claim-section"><h2>History and outcomes</h2>{history.map((item, index) => <div className="claim-history-row" key={index}><b>{item.status.replaceAll("_", " ")}</b><span>{item.reason}</span><small>{new Date(item.date).toLocaleString("en-NA")}</small></div>)}{["SUBMITTED", "ACKNOWLEDGED", "PARTIALLY_PAID", "REJECTED", "RESUBMISSION_REQUIRED"].includes(claim.status) && <div className="manager-actions claim-outcomes">{claim.status === "SUBMITTED" && <button className="btn btn-light" onClick={() => openOutcome("ACKNOWLEDGED")}>Mark acknowledged</button>}<button className="btn btn-light" onClick={() => openOutcome("PARTIALLY_PAID")}>Record partial payment</button><button className="btn btn-light" onClick={() => openOutcome("PAID")}>Mark paid</button><button className="btn btn-light" onClick={() => openOutcome("REJECTED")}>Mark rejected</button></div>}{["REJECTED", "RESUBMISSION_REQUIRED"].includes(claim.status) && <button className="btn btn-primary" onClick={async () => { const result = await request({ action: "RESUBMIT", id: claim.id }, "Creating resubmission…"); if (result) router.push(`/dashboard/claims/${result.id}`); }}>Create resubmission</button>}<p><Link href="/dashboard/claim-batches">Manage submission batches</Link></p></section>
    </div>
    {outcomeState && <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="claim-outcome-title">
      <button className="appointment-modal-backdrop" aria-label="Close outcome form" onClick={() => setOutcomeState(null)} />
      <form className="appointment-panel" onSubmit={(event) => { event.preventDefault(); submitOutcome(); }}>
        <div className="appointment-panel-heading"><div><span className="eyebrow">Claim outcome</span><h2 id="claim-outcome-title">{outcomeState.replaceAll("_", " ").toLowerCase()}</h2><p>Record the fund response as an auditable status event.</p></div><button type="button" aria-label="Close outcome form" onClick={() => setOutcomeState(null)}><X size={20} /></button></div>
        <div className="appointment-form-grid">
          {outcomeState.includes("PAID") && <>
            <label className="field"><span>Amount approved (NAD)</span><input className="input" type="number" min="0" step="0.01" required value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)} /></label>
            <label className="field"><span>Amount paid by medical aid (NAD)</span><input className="input" type="number" min="0.01" step="0.01" required value={outcomeAmount} onChange={(event) => setOutcomeAmount(event.target.value)} /></label>
            <label className="field"><span>Patient responsibility (NAD)</span><input className="input" type="number" min="0" step="0.01" required value={patientResponsibility} onChange={(event) => setPatientResponsibility(event.target.value)} /></label>
            <label className="field"><span>Payment date</span><DatePicker value={outcomeDate} onChange={setOutcomeDate} /></label>
            <label className="field dashboard-span-all"><span>Remittance reference (optional)</span><input className="input" value={remittanceReference} onChange={(event) => setRemittanceReference(event.target.value)} /></label>
          </>}
          {outcomeState === "REJECTED" && <>
            <label className="field"><span>Rejection code (optional)</span><input className="input" value={rejectionCode} onChange={(event) => setRejectionCode(event.target.value)} /></label>
            <label className="field"><span>Rejection description</span><input className="input" required value={rejectionDescription} onChange={(event) => setRejectionDescription(event.target.value)} /></label>
          </>}
          <label className="field dashboard-span-all"><span>Reason or fund response</span><textarea className="input" required autoFocus value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} /></label>
        </div>
        <div className="appointment-panel-actions"><button type="button" className="btn btn-light" onClick={() => setOutcomeState(null)}>Cancel</button><button className="btn btn-primary" disabled={saving || !outcomeReason.trim()}>{saving && <Loader2 className="toast-spinner" size={16} />}Record outcome</button></div>
      </form>
    </div>}
  </>;
}
