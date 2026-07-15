"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Plus, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";

type Fund = { id: string; name: string };
type Membership = { id: string; medicalAidId: string | null; fund: string; membershipNumber: string | null; plan: string | null; principalName: string | null; principalId: string | null; relationship: string | null; dependantCode: string | null; beneficiarySuffix: string | null; effectiveDate: string; expiryDate: string; preAuthorisationNumber: string | null; directBillingEnabled: boolean; reimbursementOnly: boolean; current: boolean; notes: string | null; consents: { status: string; date: string; name: string }[] };
type Editing = Omit<Membership, "fund" | "consents">;
const empty: Editing = { id: "", medicalAidId: "", membershipNumber: "", plan: "", principalName: "", principalId: "", relationship: "SELF", dependantCode: "", beneficiarySuffix: "", effectiveDate: "", expiryDate: "", preAuthorisationNumber: "", directBillingEnabled: true, reimbursementOnly: false, current: true, notes: "" };

export function PatientMedicalAidManager({ patientId, funds, memberships, consentWording }: { patientId: string; funds: Fund[]; memberships: Membership[]; consentWording: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null), [saving, setSaving] = useState(false);
  const [consentFor, setConsentFor] = useState(memberships.find((item) => item.current)?.id || memberships[0]?.id || ""), [consentStatus, setConsentStatus] = useState("GRANTED"), [consentDate, setConsentDate] = useState(new Date().toISOString().slice(0, 10)), [attachmentType, setAttachmentType] = useState("MEDICAL_AID_CARD");

  async function patch(body: object, message: string) {
    setSaving(true); const toastId = toast.loading(message);
    try { const response = await fetch("/api/medical-aid", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success("Medical-aid record saved", { id: toastId }); setEditing(null); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save medical-aid details", { id: toastId }); }
    finally { setSaving(false); }
  }

  function saveMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; const form = new FormData(event.currentTarget);
    patch({ entity: "MEMBERSHIP", id: editing.id || undefined, patientId, medicalAidId: editing.medicalAidId, membershipNumber: form.get("membershipNumber"), plan: form.get("plan") || null, principalName: form.get("principalName"), principalId: form.get("principalId") || null, relationship: editing.relationship, dependantCode: form.get("dependantCode"), beneficiarySuffix: form.get("beneficiarySuffix") || null, effectiveDate: editing.effectiveDate || null, expiryDate: editing.expiryDate || null, preAuthorisationNumber: form.get("preAuthorisationNumber") || null, directBillingEnabled: editing.directBillingEnabled, reimbursementOnly: editing.reimbursementOnly, current: editing.current, notes: form.get("notes") || null }, "Saving membership…");
  }

  return <div className="patient-aid-layout">
    <section className="card dashboard-card"><div className="manager-toolbar"><div><h2>Medical-aid records</h2><p>Membership numbers are masked in summaries. Historical records remain available.</p></div><button className="btn btn-primary" onClick={() => setEditing(empty)}><Plus size={16} />Add medical aid</button></div>
      <div className="membership-list">{memberships.map((item) => <article key={item.id}><div><b>{item.fund}</b><span>{item.membershipNumber ? `••••${item.membershipNumber.slice(-4)}` : "Number missing"} · {item.current ? "Current" : "Historical"}</span></div><div><span>{item.principalName || "Principal missing"}</span><small>{item.relationship || "Relationship missing"} · Dependant {item.dependantCode || "missing"}</small></div><div className="manager-actions"><button className="btn btn-light" onClick={() => setEditing({ id: item.id, medicalAidId: item.medicalAidId, membershipNumber: item.membershipNumber, plan: item.plan, principalName: item.principalName, principalId: item.principalId, relationship: item.relationship, dependantCode: item.dependantCode, beneficiarySuffix: item.beneficiarySuffix, effectiveDate: item.effectiveDate?.slice(0, 10) || "", expiryDate: item.expiryDate?.slice(0, 10) || "", preAuthorisationNumber: item.preAuthorisationNumber, directBillingEnabled: item.directBillingEnabled, reimbursementOnly: item.reimbursementOnly, current: item.current, notes: item.notes })}>Edit</button>{!item.current && <button className="btn btn-light" onClick={() => patch({ entity: "MEMBERSHIP", ...item, patientId, current: true, effectiveDate: item.effectiveDate || null, expiryDate: item.expiryDate || null }, "Marking membership current…")}>Mark current</button>}</div></article>)}</div>
      {!memberships.length && <div className="dashboard-empty"><h3>No medical-aid record</h3><p>Add membership details before preparing a direct medical-aid claim.</p></div>}
    </section>

    <section className="card dashboard-card"><div className="settings-card-heading"><h2>ICD-10 disclosure consent</h2><p className="muted">Consent history is append-only and never overwritten.</p></div><p className="consent-wording">{consentWording}</p>
      <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); patch({ entity: "CONSENT", patientId, patientMedicalAidId: consentFor || null, consentStatus, consentDate, patientOrGuardianName: form.get("name"), relationshipToPatient: form.get("relationship") || null, notes: form.get("notes") || null }, "Recording consent…"); }}>
        <div className="claim-form-grid"><label className="field"><span>Membership</span><CustomSelect value={consentFor} onChange={setConsentFor} options={memberships.map((item) => ({ value: item.id, label: item.fund }))} /></label><label className="field"><span>Consent decision</span><CustomSelect value={consentStatus} onChange={setConsentStatus} options={[{ value: "GRANTED", label: "I grant consent" }, { value: "DECLINED", label: "I do not grant consent" }, { value: "WITHDRAWN", label: "Withdraw consent" }]} /></label><label className="field"><span>Patient or guardian name</span><input className="input" name="name" required /></label><label className="field"><span>Relationship to patient</span><input className="input" name="relationship" /></label><label className="field"><span>Consent date</span><DatePicker value={consentDate} onChange={setConsentDate} /></label><label className="field"><span>Notes</span><input className="input" name="notes" /></label></div>
        <button className="btn btn-primary" disabled={saving || !memberships.length}>{saving ? <Loader2 className="toast-spinner" size={16} /> : <ShieldCheck size={16} />}Record consent</button>
      </form>
      <div className="consent-history">{memberships.flatMap((item) => item.consents).map((item, index) => <div key={index}><b>{item.status}</b><span>{item.name}</span><small>{new Date(item.date).toLocaleDateString("en-NA")}</small></div>)}</div>
    </section>

    <section className="card dashboard-card dashboard-span-all"><div className="settings-card-heading"><h2>Protected attachments</h2><p className="muted">Medical-aid cards and signed consent forms require authenticated access.</p></div>
      <form className="attachment-form" onSubmit={async (event) => {
        event.preventDefault(); const form = event.currentTarget, data = new FormData(form); data.set("patientMedicalAidId", consentFor); data.set("attachmentType", attachmentType); setSaving(true); const toastId = toast.loading("Uploading protected file…");
        try { const response = await fetch("/api/claim-attachments", { method: "POST", body: data }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success("Protected file uploaded", { id: toastId }); form.reset(); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed", { id: toastId }); }
        finally { setSaving(false); }
      }}><CustomSelect value={attachmentType} onChange={setAttachmentType} options={[{ value: "MEDICAL_AID_CARD", label: "Medical-aid card" }, { value: "CONSENT_FORM", label: "Signed consent form" }]} /><input className="input" type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /><button className="btn btn-light" disabled={saving || !consentFor}><FileUp size={16} />Upload</button></form>
    </section>

    {editing && <div className="appointment-modal" role="dialog" aria-modal="true"><button className="appointment-modal-backdrop" aria-label="Close membership form" onClick={() => setEditing(null)} /><form className="appointment-panel" onSubmit={saveMembership}><div className="appointment-panel-heading"><div><span className="eyebrow">Patient medical aid</span><h2>{editing.id ? "Edit membership" : "Add membership"}</h2></div><button type="button" aria-label="Close" onClick={() => setEditing(null)}>×</button></div>
      <div className="appointment-form-grid"><label className="field"><span>Fund</span><CustomSelect value={editing.medicalAidId || ""} onChange={(value) => setEditing({ ...editing, medicalAidId: value })} options={funds.map((item) => ({ value: item.id, label: item.name }))} /></label><Text name="membershipNumber" label="Membership number" value={editing.membershipNumber} required /><Text name="plan" label="Benefit option" value={editing.plan} /><Text name="principalName" label="Principal member" value={editing.principalName} required /><Text name="principalId" label="Principal ID" value={editing.principalId} /><label className="field"><span>Relationship</span><CustomSelect value={editing.relationship || "SELF"} onChange={(value) => setEditing({ ...editing, relationship: value })} options={["SELF", "SPOUSE", "CHILD", "DEPENDANT", "OTHER"].map((value) => ({ value, label: value }))} /></label><Text name="dependantCode" label="Dependant code" value={editing.dependantCode} required /><Text name="beneficiarySuffix" label="Beneficiary suffix" value={editing.beneficiarySuffix} /><label className="field"><span>Start date</span><DatePicker value={editing.effectiveDate} onChange={(value) => setEditing({ ...editing, effectiveDate: value })} /></label><label className="field"><span>Expiry date</span><DatePicker value={editing.expiryDate} onChange={(value) => setEditing({ ...editing, expiryDate: value })} /></label><Text name="preAuthorisationNumber" label="Pre-authorisation" value={editing.preAuthorisationNumber} /><Text name="notes" label="Notes" value={editing.notes} />
        {[{ key: "current", label: "Current membership" }, { key: "directBillingEnabled", label: "Direct billing enabled" }, { key: "reimbursementOnly", label: "Reimbursement only" }].map((item) => <label className="toggle-label" key={item.key}><input type="checkbox" checked={Boolean(editing[item.key as keyof Editing])} onChange={(event) => setEditing({ ...editing, [item.key]: event.target.checked })} /><span>{item.label}</span></label>)}
      </div><div className="appointment-panel-actions"><button type="button" className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving && <Loader2 className="toast-spinner" size={16} />}Save membership</button></div></form></div>}
  </div>;
}

function Text({ name, label, value, required = false }: { name: string; label: string; value: string | null; required?: boolean }) { return <label className="field"><span>{label}</span><input className="input" name={name} defaultValue={value ?? ""} required={required} /></label>; }
