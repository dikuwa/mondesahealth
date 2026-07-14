"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";

type PatientOption = {
  id: string;
  fullName: string;
  patientNumber: string;
  phone: string;
};
export function ManualAppointment({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [mode, setMode] = useState("EXISTING"),
    [timing, setTiming] = useState("SCHEDULED"),
    [source, setSource] = useState("PHONE"),
    [date, setDate] = useState(""),
    [patientId, setPatientId] = useState(""),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [loadingSlots, setLoadingSlots] = useState(false),
    [saving, setSaving] = useState(false),
    [sameWhatsapp, setSameWhatsapp] = useState(true);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  async function loadSlots(value: string) {
    setDate(value);
    setTime("");
    setSlots([]);
    if (!value) return;
    setLoadingSlots(true);
    try {
      const response = await fetch(`/api/slots?date=${value}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSlots(data.slots || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load available times",
      );
    } finally {
      setLoadingSlots(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(timing==="NOW"&&!window.confirm("Create this walk-in at the current time? Review the live schedule for overlapping appointments before continuing."))return;
    setSaving(true);
    const toastId = toast.loading("Creating appointment…");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientMode: mode,
          patientId,
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          email: form.get("email"),
          whatsapp: sameWhatsapp ? form.get("phone") : form.get("whatsapp"),
          source,
          timing,
          date,
          time,
          reason: form.get("reason"),
          notes: form.get("notes"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`Appointment ${data.reference} created`, { id: toastId });
      setOpen(false);
      setDate("");
      setPatientId("");
      setTime("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create appointment",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <CalendarPlus size={17} /> Add appointment
      </button>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close appointment form"
            onClick={() => setOpen(false)}
          />
          <form className="appointment-panel" onSubmit={submit}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Staff booking</span>
                <h2>New appointment</h2>
                <p>
                  Create a booking from a call, walk-in, WhatsApp or staff
                  request.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="appointment-form-grid">
              <div className="field">
                <label>Patient</label>
                <CustomSelect
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "EXISTING", label: "Existing patient" },
                    { value: "NEW", label: "New patient" },
                  ]}
                />
              </div>
              <div className="field">
                <label>Source</label>
                <CustomSelect
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: "PHONE", label: "Phone call" },
                    { value: "WALK_IN", label: "Walk-in" },
                    { value: "WHATSAPP", label: "WhatsApp" },
                    { value: "STAFF", label: "Staff-created" },
                  ]}
                />
              </div>
              {mode === "EXISTING" ? (
                <div className="field dashboard-span-all">
                  <label>Select patient</label>
                  <CustomSelect
                    ariaLabel="Patient"
                    value={patientId}
                    onChange={setPatientId}
                    placeholder="Search/select a patient"
                    options={patients.map((p) => ({
                      value: p.id,
                      label: `${p.fullName} · ${p.patientNumber} · ${p.phone}`,
                    }))}
                  />
                </div>
              ) : (
                <>
                  <div className="field dashboard-span-all">
                    <label>Full name</label>
                    <input className="input" name="fullName" required />
                  </div>
                  <div className="field">
                    <label>Cellphone</label>
                    <input
                      className="input"
                      name="phone"
                      inputMode="tel"
                      required
                    />
                  </div>
                  <div className="field">
                    <label>
                      Email <span>(optional)</span>
                    </label>
                    <input className="input" name="email" type="email" />
                  </div>
                  <label
                    className="dashboard-span-all"
                    style={{ display: "flex", gap: 9, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={sameWhatsapp}
                      onChange={(e) => setSameWhatsapp(e.target.checked)}
                    />{" "}
                    Cellphone is also the WhatsApp number
                  </label>
                  {!sameWhatsapp && (
                    <div className="field dashboard-span-all">
                      <label>WhatsApp number</label>
                      <input className="input" name="whatsapp" />
                    </div>
                  )}
                </>
              )}
              <div className="field dashboard-span-all">
                <label>When</label>
                <CustomSelect ariaLabel="When"
                  value={timing}
                  onChange={setTiming}
                  options={[
                    { value: "SCHEDULED", label: "Schedule a time" },
                    { value: "NOW", label: "Walk-in now" },
                  ]}
                />
              </div>
              {timing === "SCHEDULED" && (
                <>
                  <div className="field">
                    <label>Date</label>
                    <DatePicker
                      value={date}
                      onChange={loadSlots}
                      min={new Date().toISOString().slice(0, 10)}
                      ariaLabel="Appointment date"
                    />
                  </div>
                  <div className="field">
                    <label>Available time</label>
                    <CustomSelect ariaLabel="Available time"
                      value={time}
                      onChange={setTime}
                      disabled={!date || loadingSlots}
                      placeholder={
                        loadingSlots
                          ? "Loading times…"
                          : date
                            ? "Choose a time"
                            : "Choose a date first"
                      }
                      options={slots.map((s) => ({ value: s, label: s }))}
                    />
                  </div>
                </>
              )}
              <div className="field dashboard-span-all">
                <label>Reason for visit</label>
                  <input
                    className="input"
                    name="reason"
                    aria-label="Reason for visit"
                  placeholder="e.g. Follow-up consultation"
                  required
                />
              </div>
              <div className="field dashboard-span-all">
                <label>
                  Internal note <span>(optional)</span>
                </label>
                <textarea
                  className="input"
                  name="notes"
                  placeholder="Information for the practice team"
                />
              </div>
            </div>
            <div className="appointment-panel-actions">
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
                  (mode === "EXISTING" && !patientId) ||
                  (timing === "SCHEDULED" && (!date || !time))
                }
              >
                {saving && <Loader2 className="toast-spinner" size={17} />}{" "}
                Create appointment
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
