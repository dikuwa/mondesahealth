"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Save, Sparkles, Stamp } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";

type Patient = { id: string; label: string };
type Appointment = { id: string; patientId: string; label: string; consultationDate: string; consultationTime: string };
type Doctor = { id: string; label: string };
type Draft = {
  id: string; patientId: string; appointmentId: string; doctorUserId: string; purpose: string; consultationDate: string; consultationTime: string;
  leaveFrom: string; leaveTo: string; returnDate: string; fitnessStatus: string; restrictions: string; diagnosisDisclosure: string;
  diagnosisPlainText: string; doctorNotes: string; certificateWording: string; aiDraftUsed: boolean;
};

const tomorrow = (date: string) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + 1); return value.toISOString().slice(0, 10); };
const labels: Record<string, string> = { WORK: "Work", SCHOOL: "School", OTHER: "Other", UNFIT_FOR_WORK: "Unfit for work", UNFIT_FOR_SCHOOL: "Unfit for school", FIT_WITH_RESTRICTIONS: "Fit with restrictions", FIT_TO_RETURN: "Fit to return" };

export function SickNoteForm({ patients, appointments, doctors, initial }: { patients: Patient[]; appointments: Appointment[]; doctors: Doctor[]; initial: Draft }) {
  const router = useRouter();
  const [form, setForm] = useState(initial), [saving, setSaving] = useState(false), [aiBusy, setAiBusy] = useState(false), [preview, setPreview] = useState(false);
  const set = (key: keyof Draft, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const patientAppointments = useMemo(() => appointments.filter((item) => item.patientId === form.patientId), [appointments, form.patientId]);
  function chooseAppointment(value: string) {
    const item = appointments.find((appointment) => appointment.id === value);
    setForm((current) => ({ ...current, appointmentId: value, ...(item ? { patientId: item.patientId, consultationDate: item.consultationDate, consultationTime: item.consultationTime } : {}) }));
  }
  async function save(issue = false) {
    setSaving(true);
    const toastId = toast.loading(issue ? "Issuing medical certificate…" : "Saving draft…");
    try {
      const endpoint = form.id ? `/api/sick-notes/${form.id}` : "/api/sick-notes";
      const response = await fetch(endpoint, { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save sick note.");
      const id = data.id as string;
      if (issue) {
        const issued = await fetch(`/api/sick-notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ISSUE" }) });
        const result = await issued.json();
        if (!issued.ok) throw new Error(result.error || "The draft was saved but could not be issued.");
        toast.success("Medical certificate issued", { id: toastId });
      } else toast.success("Draft saved", { id: toastId });
      router.push(`/dashboard/sick-notes/${id}`);
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save sick note.", { id: toastId }); }
    finally { setSaving(false); }
  }
  async function draftWithAi() {
    setAiBusy(true);
    const toastId = toast.loading("Drafting certificate wording…");
    try {
      const response = await fetch("/api/sick-notes/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id || undefined, doctorNotes: form.doctorNotes, purpose: form.purpose, fitnessStatus: form.fitnessStatus, leaveFrom: form.leaveFrom, leaveTo: form.leaveTo, returnDate: form.returnDate, restrictions: form.restrictions }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setForm((current) => ({ ...current, certificateWording: data.wording, aiDraftUsed: true }));
      toast.success("AI wording ready for clinician review", { id: toastId });
    } catch (error) { toast.error(error instanceof Error ? error.message : "AI wording is unavailable. Continue manually.", { id: toastId }); }
    finally { setAiBusy(false); }
  }
  return <div className="sick-note-editor">
    <section className="card sick-note-form-card">
      <div className="sick-note-form-grid">
        <label className="field sick-note-wide"><span>Patient *</span><CustomSelect value={form.patientId} onChange={(value) => setForm((current) => ({ ...current, patientId: value, appointmentId: "" }))} options={patients.map((item) => ({ value: item.id, label: item.label }))} placeholder="Choose patient" /></label>
        <label className="field sick-note-wide"><span>Appointment (optional)</span><CustomSelect value={form.appointmentId} onChange={chooseAppointment} options={[{ value: "", label: "No linked appointment" }, ...patientAppointments.map(({ id, label }) => ({ value: id, label }))]} /></label>
        <label className="field"><span>Authorised doctor *</span><CustomSelect value={form.doctorUserId} onChange={(value) => set("doctorUserId", value)} options={doctors.map((item) => ({ value: item.id, label: item.label }))} /></label>
        <label className="field"><span>Purpose *</span><CustomSelect value={form.purpose} onChange={(value) => set("purpose", value)} options={["WORK", "SCHOOL", "OTHER"].map((value) => ({ value, label: labels[value] }))} /></label>
        <label className="field"><span>Consultation date *</span><DatePicker value={form.consultationDate} onChange={(value) => set("consultationDate", value)} /></label>
        <label className="field"><span>Consultation time</span><input className="input" type="time" value={form.consultationTime} onChange={(event) => set("consultationTime", event.target.value)} /></label>
        <label className="field"><span>Leave from *</span><DatePicker value={form.leaveFrom} onChange={(value) => set("leaveFrom", value)} /></label>
        <label className="field"><span>Leave to *</span><DatePicker value={form.leaveTo} onChange={(value) => setForm((current) => ({ ...current, leaveTo: value, returnDate: value ? tomorrow(value) : "" }))} min={form.leaveFrom} /></label>
        <label className="field"><span>Return date *</span><DatePicker value={form.returnDate} onChange={(value) => set("returnDate", value)} min={form.leaveTo ? tomorrow(form.leaveTo) : undefined} /></label>
        <label className="field"><span>Fitness status *</span><CustomSelect value={form.fitnessStatus} onChange={(value) => set("fitnessStatus", value)} options={["UNFIT_FOR_WORK", "UNFIT_FOR_SCHOOL", "FIT_WITH_RESTRICTIONS", "FIT_TO_RETURN"].map((value) => ({ value, label: labels[value] }))} /></label>
        {form.fitnessStatus === "FIT_WITH_RESTRICTIONS" && <label className="field sick-note-wide"><span>Temporary restrictions *</span><textarea className="input" rows={3} value={form.restrictions} onChange={(event) => set("restrictions", event.target.value)} /></label>}
        <fieldset className="sick-note-wide sick-note-choice"><legend>Diagnosis disclosure</legend><label><input type="radio" checked={form.diagnosisDisclosure === "NOT_DISCLOSED"} onChange={() => setForm((current) => ({ ...current, diagnosisDisclosure: "NOT_DISCLOSED", diagnosisPlainText: "" }))} /> Not disclosed</label><label><input type="radio" checked={form.diagnosisDisclosure === "CONSENTED"} onChange={() => set("diagnosisDisclosure", "CONSENTED")} /> Patient consent recorded</label></fieldset>
        {form.diagnosisDisclosure === "CONSENTED" && <label className="field sick-note-wide"><span>Diagnosis (plain text)</span><input className="input" value={form.diagnosisPlainText} onChange={(event) => set("diagnosisPlainText", event.target.value)} /></label>}
        <label className="field sick-note-wide"><span>Clinician notes *</span><textarea className="input" rows={5} value={form.doctorNotes} onChange={(event) => set("doctorNotes", event.target.value)} placeholder="Internal clinical basis for issuing this certificate. Never shown publicly." /><small>Required to issue. These notes remain internal and do not appear on the certificate.</small></label>
        <label className="field sick-note-wide"><span>Certificate wording *</span><textarea className="input" rows={5} value={form.certificateWording} onChange={(event) => set("certificateWording", event.target.value)} placeholder="Write the certificate statement manually or draft it from your notes." /></label>
      </div>
      <div className="sick-note-ai-row"><button className="btn btn-light" type="button" disabled={aiBusy || form.doctorNotes.trim().length < 5} onClick={draftWithAi}>{aiBusy ? <Loader2 className="toast-spinner" size={16} /> : <Sparkles size={16} />} Draft wording with AI</button><small>AI rewrites only the facts you entered. Review and edit every draft before issuing.</small></div>
      <div className="sick-note-actions"><button className="btn btn-light" type="button" onClick={() => setPreview((value) => !value)}><Eye size={16} /> {preview ? "Hide preview" : "Preview"}</button><span /><button className="btn btn-light" disabled={saving} onClick={() => save(false)}><Save size={16} /> Save draft</button><button className="btn btn-primary" disabled={saving} onClick={() => save(true)}>{saving ? <Loader2 className="toast-spinner" size={16} /> : <Stamp size={16} />} Issue sick note</button></div>
    </section>
    {preview && <aside className="card sick-note-preview"><span className="eyebrow">Certificate preview</span><h2>Medical certificate</h2><dl><div><dt>Patient</dt><dd>{patients.find((item) => item.id === form.patientId)?.label || "Not selected"}</dd></div><div><dt>Purpose</dt><dd>{labels[form.purpose]}</dd></div><div><dt>Leave</dt><dd>{form.leaveFrom || "—"} to {form.leaveTo || "—"}</dd></div><div><dt>Return</dt><dd>{form.returnDate || "—"}</dd></div><div><dt>Fitness</dt><dd>{labels[form.fitnessStatus]}</dd></div></dl><p>{form.certificateWording || "Certificate wording will appear here."}</p><small>Draft preview only. A certificate number, signature and QR verification are applied when issued.</small></aside>}
  </div>;
}
