"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { NativeSelect } from "@/components/ui/native-select";

type PatientOption = { id: string; fullName: string; patientNumber: string; phone: string };

export function ManualAppointment({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [patientId, setPatientId] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function loadSlots(value: string) {
    setDate(value); setTime(""); setSlots([]);
    if (!value) return;
    setLoadingSlots(true);
    const response = await fetch(`/api/slots?date=${value}`);
    const data = await response.json();
    setSlots(response.ok ? data.slots : []);
    setLoadingSlots(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/appointments", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ patientId:form.get("patientId"), date:form.get("date"), time:form.get("time"), reason:form.get("reason"), notes:form.get("notes") }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return toast.error(data.error || "Could not create appointment");
    toast.success(`Appointment ${data.reference} confirmed`);
    setOpen(false); setDate(""); setPatientId(""); setTime(""); setSlots([]); router.refresh();
  }

  return <>
    <button className="btn btn-primary" onClick={() => setOpen(true)}><CalendarPlus size={17}/> Add appointment</button>
    {open && <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title">
      <button className="appointment-modal-backdrop" aria-label="Close appointment form" onClick={() => setOpen(false)}/>
      <form className="appointment-panel" onSubmit={submit}>
        <div className="appointment-panel-heading"><div><span className="eyebrow">Staff booking</span><h2 id="appointment-dialog-title">New appointment</h2><p>Create a confirmed appointment for an existing patient.</p></div><button type="button" aria-label="Close appointment form" onClick={() => setOpen(false)}><X size={20}/></button></div>
        {patients.length ? <div className="appointment-form-grid">
          <div className="field dashboard-span-all"><label htmlFor="manual-patient">Patient</label><NativeSelect id="manual-patient" name="patientId" required value={patientId} onChange={event=>setPatientId(event.target.value)}><option value="" disabled>Select a patient</option>{patients.map(patient => <option value={patient.id} key={patient.id}>{patient.fullName} · {patient.patientNumber} · {patient.phone}</option>)}</NativeSelect></div>
          <div className="field"><label htmlFor="manual-date">Date</label><input id="manual-date" name="date" type="date" className="input" min={new Date().toISOString().slice(0,10)} value={date} onChange={event => loadSlots(event.target.value)} required/></div>
          <div className="field"><label htmlFor="manual-time">Available time</label><NativeSelect id="manual-time" name="time" required disabled={!date || loadingSlots || !slots.length} value={time} onChange={event=>setTime(event.target.value)}><option value="" disabled>{loadingSlots ? "Loading times…" : slots.length ? "Select a time" : date ? "No times available" : "Choose a date first"}</option>{slots.map(slot => <option value={slot} key={slot}>{slot}</option>)}</NativeSelect></div>
          <div className="field dashboard-span-all"><label htmlFor="manual-reason">Reason for visit</label><input id="manual-reason" name="reason" className="input" maxLength={200} placeholder="e.g. Follow-up consultation" required/></div>
          <div className="field dashboard-span-all"><label htmlFor="manual-notes">Internal note <span>(optional)</span></label><textarea id="manual-notes" name="notes" className="input" maxLength={500} placeholder="Information for the practice team"/></div>
        </div> : <div className="appointment-empty"><p>Add a patient record before creating a staff appointment.</p><a className="btn btn-primary" href="/dashboard/patients">Go to patients</a></div>}
        {patients.length > 0 && <div className="appointment-panel-actions"><button type="button" className="btn btn-light" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving && <Loader2 className="toast-spinner" size={17}/>} Confirm appointment</button></div>}
      </form>
    </div>}
  </>;
}
