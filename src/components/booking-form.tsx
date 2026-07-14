"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePicker } from "@/components/ui/date-picker";

type Fund = { id: string; name: string; abbreviation: string | null };

export function BookingForm({ funds, mode }: { funds: Fund[]; mode: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [reference, setReference] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    sameWhatsapp: true,
    whatsapp: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    patientType: "NEW",
    communication: "WHATSAPP",
    reason: "",
    notes: "",
    paymentType: "PRIVATE",
    medicalAidId: "",
    customFundName: "",
    membershipNumber: "",
    date: "",
    time: "",
    period: "ANYTIME",
    consent: false,
    emergency: false,
  });
  const update = (key: string, value: string | boolean) =>
    setForm((v) => ({ ...v, [key]: value }));
  async function chooseDate(date: string) {
    update("date", date);
    update("time", "");
    setSlots([]);
    if (!date || mode !== "AVAILABLE_TIME") return;
    setSlotsLoading(true);
    try {
      const response = await fetch(`/api/slots?date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSlots(data.slots || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load appointment times.",
      );
    } finally {
      setSlotsLoading(false);
    }
  }
  function next() {
    if (step === 1 && (!form.fullName || !form.phone || !form.dateOfBirth)) {
      toast.error("Please complete your name, phone and date of birth.");
      return;
    }
    if (
      step === 2 &&
      (!form.date || (mode === "AVAILABLE_TIME" && !form.time) || !form.reason)
    ) {
      toast.error(
        "Please choose a date and tell us briefly why you are visiting.",
      );
      return;
    }
    setStep((s) => s + 1);
  }
  async function submit() {
    if (!form.consent || !form.emergency) {
      toast.error(
        "Please accept the booking consent and emergency acknowledgement.",
      );
      return;
    }
    setLoading(true);
    const id = toast.loading("Reserving your appointment…");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Booking could not be completed.");
      toast.success("Booking received", { id });
      setReference(data.reference);
      setStep(4);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed.", {
        id,
      });
    } finally {
      setLoading(false);
    }
  }
  if (step === 4)
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <CheckCircle2
          size={52}
          color="#1f5a4c"
          style={{ margin: "0 auto 18px" }}
        />
        <div className="eyebrow">Booking received</div>
        <h2 className="display" style={{ fontSize: 40, margin: "12px" }}>
          Thank you, {form.fullName.split(" ")[0]}.
        </h2>
        <p style={{ color: "#5c716a", lineHeight: 1.7 }}>
          {mode === "AVAILABLE_TIME"
            ? "Your appointment has been reserved. Keep the secure link in your confirmation to manage it."
            : "Your appointment is not confirmed until Mondesa Health contacts you."}
        </p>
        <div
          style={{
            background: "#f7f4ed",
            borderRadius: 12,
            padding: 15,
            marginTop: 22,
          }}
        >
          <small>Appointment reference</small>
          <b style={{ display: "block", marginTop: 5 }}>{reference}</b>
        </div>
      </div>
    );
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ height: 5, background: "#e5ece8" }}>
        <div
          style={{
            height: "100%",
            width: `${(step / 3) * 100}%`,
            background: "#1f5a4c",
            transition: "width .25s",
          }}
        />
      </div>
      <div style={{ padding: "clamp(22px,5vw,42px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 27,
          }}
        >
          <div>
            <div className="eyebrow">Step {step} of 3</div>
            <h2
              style={{
                fontSize: 28,
                letterSpacing: "-.035em",
                margin: "8px 0 0",
              }}
            >
              {step === 1
                ? "Your details"
                : step === 2
                  ? "Choose your appointment"
                  : "Payment & consent"}
            </h2>
          </div>
          <span style={{ fontSize: 13, color: "#61746e" }}>
            About 3 minutes
          </span>
        </div>
        {step === 1 && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <div className="field" style={{ gridColumn: "1/-1" }}>
              <label>Full legal name *</label>
              <input
                aria-label="Full legal name *"
                className="input"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label>Main cellphone *</label>
              <input
                aria-label="Main cellphone *"
                className="input"
                placeholder="081 123 4567"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                inputMode="tel"
              />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input
                aria-label="Email (optional)"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <label
              style={{
                gridColumn: "1/-1",
                display: "flex",
                gap: 10,
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={form.sameWhatsapp}
                onChange={(e) => update("sameWhatsapp", e.target.checked)}
              />{" "}
              This cellphone is also my WhatsApp number
            </label>
            {!form.sameWhatsapp && (
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>WhatsApp number *</label>
                <input
                  aria-label="WhatsApp number *"
                  className="input"
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>Date of birth *</label>
            <DatePicker ariaLabel="Date of birth *" value={form.dateOfBirth} onChange={(value)=>update("dateOfBirth",value)} max={new Date().toISOString().slice(0,10)}/>
            </div>
            <div className="field">
              <label>Gender (optional)</label>
              <NativeSelect
                aria-label="Gender (optional)"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="">Select</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </NativeSelect>
            </div>
            <div className="field">
              <label>Patient *</label>
              <NativeSelect
                aria-label="Patient *"
                value={form.patientType}
                onChange={(e) => update("patientType", e.target.value)}
              >
                <option value="NEW">New patient</option>
                <option value="RETURNING">Returning patient</option>
              </NativeSelect>
            </div>
            <div className="field">
              <label>Preferred communication *</label>
              <NativeSelect
                aria-label="Preferred communication *"
                value={form.communication}
                onChange={(e) => update("communication", e.target.value)}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone call</option>
              </NativeSelect>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="field">
              <label>Preferred date *</label>
            <DatePicker ariaLabel="Preferred date *" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={chooseDate}/>
            </div>
            {mode === "AVAILABLE_TIME" ? (
              <div className="field">
                <label>Available time *</label>
                {!form.date ? (
                  <p style={{ color: "#6a7c76", fontSize: 14 }}>
                    Choose a date to see live availability.
                  </p>
                ) : slotsLoading ? (
                  <p className="inline-loading">
                    <Loader2 className="toast-spinner" size={17} /> Loading
                    available times…
                  </p>
                ) : slots.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      gap: 9,
                    }}
                  >
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => update("time", slot)}
                        className="btn"
                        style={{
                          border: "1px solid #cbd7d1",
                          background: form.time === slot ? "#1f5a4c" : "white",
                          color: form.time === slot ? "white" : "#18332d",
                          borderRadius: 10,
                          padding: 8,
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      background: "#fff4e2",
                      padding: 13,
                      borderRadius: 10,
                      fontSize: 14,
                    }}
                  >
                    No available times on this date. Please choose another
                    weekday.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Preferred part of day</label>
                  <NativeSelect
                    aria-label="Preferred part of day"
                    value={form.period}
                    onChange={(e) => update("period", e.target.value)}
                  >
                    <option value="ANYTIME">Anytime</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                  </NativeSelect>
                </div>
                <p
                  style={{
                    background: "#fff4e2",
                    padding: 13,
                    borderRadius: 10,
                    fontSize: 14,
                  }}
                >
                  Your appointment is not confirmed until Mondesa Health
                  contacts you.
                </p>
              </>
            )}
            <div className="field">
              <label>Reason for visit *</label>
              <input
                aria-label="Reason for visit *"
                className="input"
                maxLength={160}
                placeholder="A short general description is enough"
                value={form.reason}
                onChange={(e) => update("reason", e.target.value)}
              />
              <small style={{ color: "#70827c" }}>
                Please do not include a detailed diagnosis.
              </small>
            </div>
            <div className="field">
              <label>Additional notes (optional)</label>
              <textarea
                aria-label="Additional notes (optional)"
                className="input"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="field">
              <label>How will you pay for your consultation?</label>
              <NativeSelect
                aria-label="How will you pay for your consultation?"
                value={form.paymentType}
                onChange={(e) => update("paymentType", e.target.value)}
              >
                <option value="PRIVATE">Private or cash</option>
                <option value="MEDICAL_AID">Medical aid</option>
                <option value="NOT_SURE">Not sure</option>
              </NativeSelect>
            </div>
            {form.paymentType === "MEDICAL_AID" && (
              <>
                <div className="field">
                  <label>Medical aid fund *</label>
                  <NativeSelect
                    aria-label="Medical aid fund *"
                    value={form.medicalAidId}
                    onChange={(e) => update("medicalAidId", e.target.value)}
                  >
                    <option value="">Select your fund</option>
                    {funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.abbreviation ? ` — ${f.abbreviation}` : ""}
                      </option>
                    ))}
                    <option value="OTHER">Other</option>
                  </NativeSelect>
                </div>
                {form.medicalAidId === "OTHER" && (
                  <div className="field">
                    <label>Medical aid name *</label>
                    <input
                      aria-label="Medical aid name *"
                      className="input"
                      value={form.customFundName}
                      onChange={(e) => update("customFundName", e.target.value)}
                    />
                  </div>
                )}
                <div className="field">
                  <label>Membership number (optional now)</label>
                  <input
                    aria-label="Membership number (optional now)"
                    className="input"
                    value={form.membershipNumber}
                    onChange={(e) => update("membershipNumber", e.target.value)}
                  />
                </div>
              </>
            )}
            <label
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
                style={{ marginTop: 4 }}
              />{" "}
              I consent to Mondesa Health using this information to arrange my
              appointment and contact me about my care.
            </label>
            <label
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={form.emergency}
                onChange={(e) => update("emergency", e.target.checked)}
                style={{ marginTop: 4 }}
              />{" "}
              I understand online booking is not for emergencies. For urgent
              help, I will call 112 or visit an emergency department.
            </label>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 30,
          }}
        >
          {step > 1 ? (
            <button
              className="btn btn-light"
              type="button"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={17} /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button className="btn btn-primary" type="button" onClick={next}>
              Continue <ArrowRight size={17} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={loading}
              type="button"
              onClick={submit}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}{" "}
              Submit booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
