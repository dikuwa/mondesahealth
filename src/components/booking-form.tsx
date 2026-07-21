"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { NativeSelect } from "@/components/ui/native-select";
import { validNamibianPhone } from "@/lib/utils";
import {
  PatientIntakeAssistant,
  emptyIntake,
  type IntakeDraft,
} from "@/components/patient-intake-assistant";
import type { PublicEmergencyContact } from "@/lib/emergency";

type Fund = { id: string; name: string; abbreviation: string | null };
type BookingDepartment = {
  key: string;
  id: string;
  practiceId: string;
  practiceName: string;
  name: string;
  mode: string;
  aiIntakeEnabled: boolean;
  aiImageEnabled: boolean;
  emergencyContacts: PublicEmergencyContact[];
  services: { id: string; name: string; aiIntakeEnabled: boolean | null }[];
  providers: {
    id: string;
    displayName: string;
    aiIntakeEnabled: boolean | null;
  }[];
};

const initialForm = {
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
  departmentId: "",
  serviceId: "",
  providerId: "",
  practiceId: "",
};

type BookingValues = typeof initialForm;

function readableDate(value: string) {
  return value ? format(parseISO(value), "EEEE, d MMMM yyyy") : "";
}

export function BookingForm({
  funds,
  mode,
  departments,
  emergencyContacts,
  aiIntakeEnabled,
  aiImageEnabled,
}: {
  funds: Fund[];
  mode: string;
  departments: BookingDepartment[];
  emergencyContacts: PublicEmergencyContact[];
  aiIntakeEnabled: boolean;
  aiImageEnabled: boolean;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [reference, setReference] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<BookingValues>(() => ({
    ...initialForm,
    departmentId: departments[0]?.id || "",
    practiceId: departments[0]?.practiceId || "",
  }));
  const [intake, setIntake] = useState<IntakeDraft>(emptyIntake);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const slotsRequest = useRef<AbortController | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDepartment =
    departments.find(
      (item) =>
        item.id === form.departmentId && item.practiceId === form.practiceId,
    ) || departments[0];
  const selectedService =
    selectedDepartment?.services.find((item) => item.id === form.serviceId) ||
    null;
  const selectedProvider =
    selectedDepartment?.providers.find((item) => item.id === form.providerId) ||
    null;
  const selectedMode = selectedDepartment?.mode || mode;
  const selectedEmergencyContacts = selectedDepartment?.emergencyContacts || emergencyContacts;
  const intakeAvailable =
    (selectedDepartment?.aiIntakeEnabled ?? aiIntakeEnabled) &&
    selectedService?.aiIntakeEnabled !== false &&
    selectedProvider?.aiIntakeEnabled !== false;

  useEffect(() => {
    if (step > 1 && step < 4) stepHeading.current?.focus();
  }, [step]);

  function update<K extends keyof BookingValues>(
    key: K,
    value: BookingValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  }

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  async function chooseDate(date: string) {
    update("date", date);
    update("time", "");
    setSlots([]);
    slotsRequest.current?.abort();
    if (!date || selectedMode !== "AVAILABLE_TIME") return;

    const controller = new AbortController();
    slotsRequest.current = controller;
    setSlotsLoading(true);
    try {
      const slotParams = new URLSearchParams({
        date,
        practiceId: form.practiceId,
      });
      if (form.providerId) slotParams.set("providerId", form.providerId);
      if (form.serviceId) slotParams.set("serviceId", form.serviceId);
      const response = await fetch(`/api/slots?${slotParams}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSlots(data.slots || []);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not load appointment times.";
      setError(message);
      toast.error(message);
    } finally {
      if (slotsRequest.current === controller) setSlotsLoading(false);
    }
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (form.fullName.trim().length < 3)
        return "Enter the patient’s full legal name.";
      if (!validNamibianPhone(form.phone))
        return "Enter a valid Namibian cellphone number.";
      if (!form.dateOfBirth) return "Enter a valid date of birth.";
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
        return "Enter a valid email address.";
      if (form.communication === "EMAIL" && !form.email)
        return "Add an email address for email communication.";
      if (
        form.communication === "WHATSAPP" &&
        !form.sameWhatsapp &&
        !validNamibianPhone(form.whatsapp)
      )
        return "Add a valid WhatsApp number for WhatsApp communication.";
    }
    if (step === 2) {
      if (!form.date) return "Choose a preferred appointment date.";
      if (selectedMode === "AVAILABLE_TIME" && !form.time)
        return "Choose one of the available appointment times.";
      if (form.reason.trim().length < 3)
        return "Tell us briefly why you are visiting.";
    }
    if (step === 3 && form.paymentType === "MEDICAL_AID") {
      if (!form.medicalAidId) return "Choose your medical aid fund.";
      if (form.medicalAidId === "OTHER" && !form.customFundName.trim())
        return "Enter the name of your medical aid fund.";
    }
    return "";
  }

  async function next() {
    const message = validateCurrentStep();
    if (message) {
      showError(message);
      return;
    }
    if (step === 2) {
      try {
        const response = await fetch("/api/intake/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CHECK",
            reason: form.reason,
            practiceId: form.practiceId,
            messages: intake.messages,
            serviceId: form.serviceId || null,
            providerId: form.providerId || null,
          }),
        });
        const data = await response.json();
        if (response.ok && data.redFlags?.length) {
          const nextIntake = {
            ...intake,
            redFlags: data.redFlags,
            emergencyNoticeShown: true,
          };
          setIntake(nextIntake);
          if (!nextIntake.emergencyNoticeAcknowledged) {
            showError(
              "Read and acknowledge the urgent safety notice before continuing.",
            );
            return;
          }
        }
      } catch {
        /* A safety endpoint failure must not erase manual booking data. Server validation runs again on submit. */
      }
    }
    setError("");
    setStep((current) => current + 1);
  }

  async function submit() {
    const message = validateCurrentStep();
    if (message) {
      showError(message);
      return;
    }
    if (!form.consent || !form.emergency) {
      showError(
        "Accept the booking consent and emergency acknowledgement to continue.",
      );
      return;
    }

    setLoading(true);
    setError("");
    const toastId = toast.loading(
      selectedMode === "AVAILABLE_TIME"
        ? "Reserving your appointment…"
        : "Sending your appointment request…",
    );
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          intake: {
            ...intake,
            images: intake.images.map((image) => ({
              filename: image.filename,
              mimeType: image.mimeType,
              fileSize: image.fileSize,
              data: image.data,
            })),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Booking could not be completed.");
      toast.success(
        selectedMode === "AVAILABLE_TIME"
          ? "Appointment booked"
          : "Appointment request sent",
        { id: toastId },
      );
      setReference(data.reference);
      setManageUrl(data.manageUrl || "");
      setStep(4);
    } catch (caught) {
      const nextError =
        caught instanceof Error ? caught.message : "Booking failed.";
      setError(nextError);
      toast.error(nextError, { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function copyManagementLink() {
    if (!manageUrl) return;
    try {
      await navigator.clipboard.writeText(
        new URL(manageUrl, window.location.origin).toString(),
      );
      toast.success("Secure appointment link copied");
    } catch {
      toast.error(
        "Could not copy the link. Open it and copy from the browser.",
      );
    }
  }

  function restart() {
    setForm({
      ...initialForm,
      departmentId: departments[0]?.id || "",
      practiceId: departments[0]?.practiceId || "",
    });
    setSlots([]);
    setReference("");
    setManageUrl("");
    setError("");
    setIntake(emptyIntake);
    setStep(1);
  }

  if (step === 4)
    return (
      <section className="card booking-success" aria-live="polite">
        <span className="booking-success-icon">
          <CheckCircle2 size={30} aria-hidden="true" />
        </span>
        <div className="eyebrow">Booking received</div>
        <h2 className="display">
          {selectedMode === "AVAILABLE_TIME"
            ? "Your appointment is booked."
            : "Your request is with the practice."}
        </h2>
        <p>
          Thank you, {form.fullName.trim().split(" ")[0]}.{" "}
          {selectedMode === "AVAILABLE_TIME"
            ? "Keep the secure link below if you need to manage your appointment."
            : "Mondesa Health will contact you before the appointment is confirmed."}
        </p>
        <div className="booking-success-details">
          <div>
            <span>Reference</span>
            <b>{reference}</b>
          </div>
          <div>
            <span>
              {selectedMode === "AVAILABLE_TIME" ? "Appointment" : "Preferred date"}
            </span>
            <b>
              {readableDate(form.date)}
              {form.time ? ` at ${form.time}` : ""}
            </b>
          </div>
        </div>
        {manageUrl && (
          <div className="booking-success-actions">
            <Link className="btn btn-primary" href={manageUrl}>
              Manage appointment <ExternalLink size={17} aria-hidden="true" />
            </Link>
            <button
              className="btn btn-light"
              type="button"
              onClick={copyManagementLink}
            >
              <Copy size={17} aria-hidden="true" /> Copy secure link
            </button>
          </div>
        )}
        <button className="booking-restart" type="button" onClick={restart}>
          <RotateCcw size={15} aria-hidden="true" /> Book another appointment
        </button>
      </section>
    );

  return (
    <section
      className="card booking-form-card"
      aria-labelledby="booking-step-title"
    >
      <div
        className="booking-progress"
        role="progressbar"
        aria-label="Booking progress"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
      >
        <div className="booking-progress-line" aria-hidden="true">
          <span style={{ width: `${((step - 1) / 2) * 100}%` }} />
        </div>
        <ol className="booking-progress-steps">
          {[
            [1, "Your details"],
            [2, "Appointment"],
            [3, "Review"],
          ].map(([number, label]) => (
            <li
              className={
                step > Number(number)
                  ? "is-complete"
                  : step === Number(number)
                    ? "is-current"
                    : ""
              }
              key={number}
            >
              <span>{number}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>
      </div>
      <div className="booking-form-body booking-step-motion" key={step}>
        <header className="booking-step-header">
          <div>
            <div className="eyebrow">Step {step} of 3</div>
            <h2 id="booking-step-title" ref={stepHeading} tabIndex={-1}>
              {step === 1
                ? "Your details"
                : step === 2
                  ? "Choose your appointment"
                  : "Review and consent"}
            </h2>
          </div>
          <span>About 3 minutes</span>
        </header>

        {error && (
          <div className="booking-error" role="alert">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="booking-field-grid">
            <div className="field booking-span-all">
              <label htmlFor="booking-full-name">Full legal name *</label>
              <input
                id="booking-full-name"
                className="input"
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-phone">Main cellphone *</label>
              <input
                id="booking-phone"
                className="input"
                placeholder="081 123 4567"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-email">Email (optional)</label>
              <input
                id="booking-email"
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
              />
            </div>
            <label className="booking-choice booking-span-all">
              <input
                type="checkbox"
                checked={form.sameWhatsapp}
                onChange={(event) =>
                  update("sameWhatsapp", event.target.checked)
                }
              />
              <span>This cellphone is also my WhatsApp number</span>
            </label>
            {!form.sameWhatsapp && (
              <div className="field booking-span-all">
                <label htmlFor="booking-whatsapp">WhatsApp number *</label>
                <input
                  id="booking-whatsapp"
                  className="input"
                  value={form.whatsapp}
                  onChange={(event) => update("whatsapp", event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="booking-dob">Date of birth *</label>
              <DatePicker
                id="booking-dob"
                ariaLabel="Date of birth *"
                value={form.dateOfBirth}
                onChange={(value) => update("dateOfBirth", value)}
                max={today}
              />
            </div>
            <div className="field">
              <label htmlFor="booking-gender">Gender (optional)</label>
              <NativeSelect
                id="booking-gender"
                aria-label="Gender (optional)"
                value={form.gender}
                onChange={(event) => update("gender", event.target.value)}
              >
                <option value="">Select</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </NativeSelect>
            </div>
            <div className="field">
              <label htmlFor="booking-patient-type">Patient *</label>
              <NativeSelect
                id="booking-patient-type"
                aria-label="Patient *"
                value={form.patientType}
                onChange={(event) => update("patientType", event.target.value)}
              >
                <option value="NEW">New patient</option>
                <option value="RETURNING">Returning patient</option>
              </NativeSelect>
            </div>
            <div className="field">
              <label htmlFor="booking-communication">
                Preferred communication *
              </label>
              <NativeSelect
                id="booking-communication"
                aria-label="Preferred communication *"
                value={form.communication}
                onChange={(event) =>
                  update("communication", event.target.value)
                }
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
          <div className="booking-field-stack">
            {departments.length > 1 && (
              <div className="field">
                <label htmlFor="booking-department">
                  Practice and service area *
                </label>
                <NativeSelect
                  id="booking-department"
                  value={selectedDepartment?.key || ""}
                  onChange={(event) => {
                    const next = departments.find(
                      (item) => item.key === event.target.value,
                    );
                    if (next)
                      setForm((current) => ({
                        ...current,
                        departmentId: next.id,
                        practiceId: next.practiceId,
                        serviceId: "",
                        providerId: "",
                        date: "",
                        time: "",
                      }));
                  }}
                >
                  {departments.map((department) => (
                    <option key={department.key} value={department.key}>
                      {department.practiceName} · {department.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            {!!selectedDepartment?.services.length && (
              <div className="field">
                <label htmlFor="booking-service">Service (optional)</label>
                <NativeSelect
                  id="booking-service"
                  value={form.serviceId}
                  onChange={(event) => update("serviceId", event.target.value)}
                >
                  <option value="">General consultation</option>
                  {selectedDepartment.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            {!!selectedDepartment?.providers.length && (
              <div className="field">
                <label htmlFor="booking-provider">
                  Preferred clinician or provider (optional)
                </label>
                <NativeSelect
                  id="booking-provider"
                  value={form.providerId}
                  onChange={(event) => update("providerId", event.target.value)}
                >
                  <option value="">Any available provider</option>
                  {selectedDepartment.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.displayName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <div className="field">
              <label htmlFor="booking-date">Preferred date *</label>
              <DatePicker
                id="booking-date"
                ariaLabel="Preferred date *"
                min={today}
                value={form.date}
                onChange={chooseDate}
              />
            </div>
            {selectedMode === "AVAILABLE_TIME" ? (
              <div className="field">
                <span className="field-label">Available time *</span>
                {!form.date ? (
                  <p className="booking-field-help">
                    Choose a date to see live availability.
                  </p>
                ) : slotsLoading ? (
                  <p className="inline-loading" aria-live="polite">
                    <Loader2 className="toast-spinner" size={17} /> Loading
                    available times…
                  </p>
                ) : slots.length ? (
                  <div
                    className="booking-slot-grid"
                    aria-label="Available times"
                  >
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => update("time", slot)}
                        className={`booking-time-option${form.time === slot ? " is-selected" : ""}`}
                        aria-pressed={form.time === slot}
                      >
                        <Clock3 size={15} aria-hidden="true" /> {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="booking-notice">
                    No available times on this date. Please choose another
                    weekday.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="booking-period">Preferred part of day</label>
                  <NativeSelect
                    id="booking-period"
                    aria-label="Preferred part of day"
                    value={form.period}
                    onChange={(event) => update("period", event.target.value)}
                  >
                    <option value="ANYTIME">Anytime</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                  </NativeSelect>
                </div>
                <p className="booking-notice">
                  This is a request. Mondesa Health will contact you before the
                  appointment is confirmed.
                </p>
              </>
            )}
            <div className="field">
              <label htmlFor="booking-reason">Reason for visit *</label>
              <textarea
                id="booking-reason"
                className="input"
                maxLength={2000}
                rows={4}
                value={form.reason}
                onChange={(event) => update("reason", event.target.value)}
                required
              />
              <small className="booking-field-help">
                Briefly describe what is troubling you. You may write it
                yourself or use optional AI assistance. {form.reason.length}
                /2000
              </small>
              <PatientIntakeAssistant
                reason={form.reason}
                practiceId={form.practiceId}
                serviceId={form.serviceId}
                providerId={form.providerId}
                aiAvailable={intakeAvailable}
                imagesAvailable={selectedDepartment?.aiImageEnabled ?? aiImageEnabled}
                emergencyContacts={selectedEmergencyContacts}
                value={intake}
                onChange={setIntake}
              />
            </div>
            <div className="field">
              <label htmlFor="booking-notes">Additional notes (optional)</label>
              <textarea
                id="booking-notes"
                className="input"
                maxLength={800}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="booking-field-stack">
            <div className="booking-review-card">
              <CalendarCheck2 size={20} aria-hidden="true" />
              <div>
                <span>
                  {selectedMode === "AVAILABLE_TIME" ? "Appointment" : "Preferred date"}
                </span>
                <b>
                  {readableDate(form.date)}
                  {form.time ? ` at ${form.time}` : ""}
                </b>
              </div>
            </div>
            <div className="booking-review-intake">
              <b>Reason for visit</b>
              <p>{form.reason}</p>
              {intake.approvedSummary && (
                <>
                  <b>AI-organised summary · Patient approved</b>
                  <p>{intake.approvedSummary}</p>
                </>
              )}
              {intake.images.length > 0 && (
                <span>
                  {intake.images.length} optional photo
                  {intake.images.length === 1 ? "" : "s"} attached securely
                </span>
              )}
              <button type="button" onClick={() => setStep(2)}>
                Edit appointment information
              </button>
            </div>
            <div className="field">
              <label htmlFor="booking-payment">
                How will you pay for your consultation?
              </label>
              <NativeSelect
                id="booking-payment"
                aria-label="How will you pay for your consultation?"
                value={form.paymentType}
                onChange={(event) => update("paymentType", event.target.value)}
              >
                <option value="PRIVATE">Private or cash</option>
                <option value="MEDICAL_AID">Medical aid</option>
                <option value="NOT_SURE">Not sure</option>
              </NativeSelect>
            </div>
            {form.paymentType === "MEDICAL_AID" && (
              <>
                <div className="field">
                  <label htmlFor="booking-medical-aid">
                    Medical aid fund *
                  </label>
                  <NativeSelect
                    id="booking-medical-aid"
                    aria-label="Medical aid fund *"
                    value={form.medicalAidId}
                    onChange={(event) =>
                      update("medicalAidId", event.target.value)
                    }
                  >
                    <option value="">Select your fund</option>
                    {funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name}
                        {fund.abbreviation ? ` — ${fund.abbreviation}` : ""}
                      </option>
                    ))}
                    <option value="OTHER">Other</option>
                  </NativeSelect>
                </div>
                {form.medicalAidId === "OTHER" && (
                  <div className="field">
                    <label htmlFor="booking-fund-name">
                      Medical aid name *
                    </label>
                    <input
                      id="booking-fund-name"
                      className="input"
                      value={form.customFundName}
                      onChange={(event) =>
                        update("customFundName", event.target.value)
                      }
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="booking-membership">
                    Membership number (optional now)
                  </label>
                  <input
                    id="booking-membership"
                    className="input"
                    value={form.membershipNumber}
                    onChange={(event) =>
                      update("membershipNumber", event.target.value)
                    }
                  />
                </div>
              </>
            )}
            <label className="booking-choice is-consent">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => update("consent", event.target.checked)}
              />
              <span>
                I consent to Mondesa Health using this information to arrange my
                appointment and contact me about my care.
              </span>
            </label>
            <label className="booking-choice is-consent">
              <input
                type="checkbox"
                checked={form.emergency}
                onChange={(event) => update("emergency", event.target.checked)}
              />
              <span>
                I understand online booking is not for emergencies. For urgent
                help, I will{" "}
                {selectedEmergencyContacts[0]
                  ? `call ${selectedEmergencyContacts[0].label} on ${selectedEmergencyContacts[0].phone} or `
                  : "contact my nearest emergency service or "}
                visit the nearest emergency facility.
              </span>
            </label>
          </div>
        )}

        <div className={`booking-actions${step === 1 ? " is-single" : ""}`}>
          {step > 1 && (
            <button
              className="btn btn-light"
              type="button"
              onClick={() => {
                setError("");
                setStep((current) => current - 1);
              }}
            >
              <ArrowLeft size={17} aria-hidden="true" /> Back
            </button>
          )}
          {step < 3 ? (
            <button className="btn btn-primary" type="button" onClick={next}>
              Continue <ArrowRight size={17} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={loading}
              type="button"
              onClick={submit}
            >
              {loading && <Loader2 className="toast-spinner" size={18} />}
              {selectedMode === "AVAILABLE_TIME" ? "Book appointment" : "Send request"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
