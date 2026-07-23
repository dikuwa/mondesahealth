"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Save,
  SaveAll,
  Trash2,
  User,
  MapPin,
  Stethoscope,
  Clock,
  HeartPulse,
  FileText,
  Users,
  ClipboardCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { PRACTICE_TYPE_OPTIONS } from "@/lib/practice-registration-options";

const STEPS = [
  { label: "Practice identity", icon: Building2 },
  { label: "Owner & practitioners", icon: User },
  { label: "Locations", icon: MapPin },
  { label: "Services", icon: Stethoscope },
  { label: "Operating information", icon: Clock },
  { label: "Medical & admin", icon: HeartPulse },
  { label: "Documents & branding", icon: FileText },
  { label: "Users & permissions", icon: Users },
  { label: "Review & submit", icon: ClipboardCheck },
] as const;

type OnboardingData = {
  practiceIdentity: Record<string, string>;
  practitioners: PractitionerData[];
  locations: LocationData[];
  services: ServiceData[];
  operatingInfo: Record<string, string>;
  medicalAdmin: Record<string, string | boolean>;
  documentsBranding: Record<string, string | boolean>;
  usersPermissions: UserInviteData[];
};

type PractitionerData = {
  id: string;
  fullName: string;
  professionalTitle: string;
  qualifications: string;
  registrationNumber: string;
  email: string;
  phone: string;
  canSignDocuments: boolean;
};

type LocationData = {
  id: string;
  name: string;
  address: string;
  town: string;
  region: string;
  phone: string;
  email: string;
  public: boolean;
};

type ServiceData = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: string;
  active: boolean;
};

type UserInviteData = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const CATEGORY_SERVICE_TEMPLATES: Record<string, { name: string; description: string; durationMinutes: number }[]> = {
  GENERAL_PRACTICE: [
    { name: "General consultation", description: "Standard consultation with a general practitioner", durationMinutes: 15 },
    { name: "Extended consultation", description: "Extended consultation for complex cases", durationMinutes: 30 },
    { name: "Follow-up visit", description: "Routine follow-up appointment", durationMinutes: 15 },
    { name: "Health screening", description: "General health screening and wellness check", durationMinutes: 30 },
    { name: "Vaccination", description: "Routine vaccination or immunisation", durationMinutes: 15 },
  ],
  DENTAL_PRACTICE: [
    { name: "Dental check-up", description: "Routine dental examination", durationMinutes: 30 },
    { name: "Dental cleaning", description: "Professional teeth cleaning", durationMinutes: 30 },
    { name: "Tooth extraction", description: "Simple tooth extraction procedure", durationMinutes: 30 },
    { name: "Filling", description: "Dental filling for cavity repair", durationMinutes: 30 },
  ],
  PHYSIOTHERAPY: [
    { name: "Initial assessment", description: "Comprehensive physiotherapy assessment", durationMinutes: 45 },
    { name: "Follow-up session", description: "Regular physiotherapy treatment session", durationMinutes: 30 },
    { name: "Rehabilitation", description: "Structured rehabilitation programme", durationMinutes: 45 },
  ],
};

const DEFAULT_TEMPLATES = [
  { name: "General consultation", description: "Standard consultation", durationMinutes: 15 },
  { name: "Follow-up appointment", description: "Routine follow-up", durationMinutes: 15 },
];

const USER_ROLES = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ADMINISTRATOR", label: "Administrator" },
  { value: "FINANCE", label: "Finance staff" },
];

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function OnboardingWizard({ practiceId }: { practiceId: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    practiceIdentity: {},
    practitioners: [],
    locations: [],
    services: [],
    operatingInfo: {},
    medicalAdmin: {},
    documentsBranding: {},
    usersPermissions: [],
  });

  // Load saved progress on mount
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/platform/practices/${practiceId}/onboarding`);
        if (response.ok) {
          const saved = await response.json();
          if (saved.draftData) {
            setData(saved.draftData);
            setCurrentStep(saved.currentStep || 0);
          }
        }
      } catch {
        // No saved progress
      }
    }
    load();
  }, [practiceId]);

  const autosave = useCallback(
    async (updated?: Partial<OnboardingData>) => {
      setSaving(true);
      try {
        const payload = updated ? { ...data, ...updated } : data;
        // Fire-and-forget autosave
        await fetch(`/api/platform/practices/${practiceId}/onboarding`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentStep,
            draftData: payload,
          }),
        });
      } catch {
        // Silently fail for autosave
      } finally {
        setSaving(false);
      }
    },
    [data, currentStep, practiceId],
  );

  function updateField(step: keyof OnboardingData, field: string, value: string | boolean) {
    setData((prev) => {
      const updated = { ...prev };
      if (step === "practiceIdentity" || step === "operatingInfo") {
        (updated[step] as Record<string, string>)[field] = String(value);
      } else if (step === "medicalAdmin" || step === "documentsBranding") {
        (updated[step] as Record<string, string | boolean>)[field] = value;
      }
      return updated;
    });
  }

  function addPractitioner() {
    setData((prev) => ({
      ...prev,
      practitioners: [
        ...prev.practitioners,
        {
          id: `p-${Date.now()}`,
          fullName: "",
          professionalTitle: "",
          qualifications: "",
          registrationNumber: "",
          email: "",
          phone: "",
          canSignDocuments: false,
        },
      ],
    }));
  }

  function updatePractitioner(id: string, field: string, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      practitioners: prev.practitioners.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));
  }

  function removePractitioner(id: string) {
    setData((prev) => ({
      ...prev,
      practitioners: prev.practitioners.filter((p) => p.id !== id),
    }));
  }

  function addLocation() {
    setData((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          id: `loc-${Date.now()}`,
          name: "",
          address: "",
          town: "",
          region: "",
          phone: "",
          email: "",
          public: true,
        },
      ],
    }));
  }

  function updateLocation(id: string, field: string, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    }));
  }

  function removeLocation(id: string) {
    setData((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== id),
    }));
  }

  function addService(name = "", description = "", duration = 30) {
    setData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: `s-${Date.now()}`,
          name,
          description,
          durationMinutes: duration,
          price: "",
          active: true,
        },
      ],
    }));
  }

  function updateService(id: string, field: string, value: string | number | boolean) {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    }));
  }

  function removeService(id: string) {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  }

  function addUserInvite() {
    setData((prev) => ({
      ...prev,
      usersPermissions: [
        ...prev.usersPermissions,
        { id: `u-${Date.now()}`, email: "", name: "", role: "RECEPTIONIST" },
      ],
    }));
  }

  function updateUserInvite(id: string, field: string, value: string) {
    setData((prev) => ({
      ...prev,
      usersPermissions: prev.usersPermissions.map((u) =>
        u.id === id ? { ...u, [field]: value } : u,
      ),
    }));
  }

  function removeUserInvite(id: string) {
    setData((prev) => ({
      ...prev,
      usersPermissions: prev.usersPermissions.filter((u) => u.id !== id),
    }));
  }

  const templatesForCategory =
    CATEGORY_SERVICE_TEMPLATES[data.practiceIdentity.practiceType] ||
    DEFAULT_TEMPLATES;

  async function submitOnboarding() {
    setSubmitting(true);
    const toastId = toast.loading("Saving onboarding information…");
    try {
      const response = await fetch(`/api/platform/practices/${practiceId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: STEPS.length,
          draftData: data,
          submitted: true,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Could not submit onboarding");
      }
      toast.success("Onboarding submitted for verification", { id: toastId });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit onboarding",
        { id: toastId },
      );
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    autosave();
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  }

  function prevStep() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="card dashboard-card onboarding-wizard">
      {/* Progress bar */}
      <div className="onboarding-progress">
        <div className="onboarding-progress-track">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="onboarding-step-indicators">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              className={`onboarding-step-dot${i <= currentStep ? " completed" : ""}${i === currentStep ? " active" : ""}`}
              onClick={() => {
                if (i <= currentStep + 1) setCurrentStep(i);
              }}
              aria-label={`Step ${i + 1}: ${s.label}`}
              title={s.label}
            >
              {i < currentStep ? (
                <CheckCircle2 size={14} />
              ) : (
                <span>{i + 1}</span>
              )}
            </button>
          ))}
        </div>
        <div className="onboarding-step-label">
          Step {currentStep + 1} of {STEPS.length}: {step.label}
          {saving && <Loader2 className="toast-spinner" size={12} />}
        </div>
      </div>

      {/* Step content */}
      <div className="onboarding-content">
        {currentStep === 0 && (
          <div className="form-grid">
            <div className="field-span-2">
              <span className="eyebrow">Step 1: Practice identity</span>
              <h3>Tell us about your practice</h3>
            </div>
            <label className="field">
              <span>Legal practice name</span>
              <input className="input" value={data.practiceIdentity.name || ""} onChange={(e) => updateField("practiceIdentity", "name", e.target.value)} placeholder="e.g. Coastal Family Practice" />
            </label>
            <label className="field">
              <span>Public display name</span>
              <input className="input" value={data.practiceIdentity.displayName || ""} onChange={(e) => updateField("practiceIdentity", "displayName", e.target.value)} placeholder="e.g. Coastal Family Practice" />
            </label>
            <label className="field">
              <span>Practice type</span>
              <CustomSelect value={data.practiceIdentity.practiceType || ""} onChange={(val) => updateField("practiceIdentity", "practiceType", val)} options={[{ value: "", label: "Select practice type", disabled: true }, ...PRACTICE_TYPE_OPTIONS]} />
            </label>
            <label className="field">
              <span>Practice number</span>
              <input className="input" value={data.practiceIdentity.practiceNumber || ""} onChange={(e) => updateField("practiceIdentity", "practiceNumber", e.target.value)} placeholder="Optional" />
            </label>
            <label className="field">
              <span>NAMAF/provider number</span>
              <input className="input" value={data.practiceIdentity.namafNumber || ""} onChange={(e) => updateField("practiceIdentity", "namafNumber", e.target.value)} placeholder="Optional" />
            </label>
            <label className="field">
              <span>Business registration number</span>
              <input className="input" value={data.practiceIdentity.businessRegNumber || ""} onChange={(e) => updateField("practiceIdentity", "businessRegNumber", e.target.value)} placeholder="Optional" />
            </label>
            <label className="field">
              <span>Tax/VAT number</span>
              <input className="input" value={data.practiceIdentity.taxNumber || ""} onChange={(e) => updateField("practiceIdentity", "taxNumber", e.target.value)} placeholder="Optional" />
            </label>
            <label className="field">
              <span>Year established</span>
              <input className="input" type="number" value={data.practiceIdentity.yearEstablished || ""} onChange={(e) => updateField("practiceIdentity", "yearEstablished", e.target.value)} placeholder="e.g. 2024" />
            </label>
            <label className="field field-span-2">
              <span>Public description</span>
              <textarea className="input" rows={3} value={data.practiceIdentity.publicDescription || ""} onChange={(e) => updateField("practiceIdentity", "publicDescription", e.target.value)} placeholder="Describe your practice for patients" />
            </label>
            <label className="field field-span-2">
              <span>Internal description</span>
              <textarea className="input" rows={2} value={data.practiceIdentity.internalDescription || ""} onChange={(e) => updateField("practiceIdentity", "internalDescription", e.target.value)} placeholder="Internal notes (not shown publicly)" />
            </label>
          </div>
        )}

        {currentStep === 1 && (
          <div className="onboarding-step-content">
            <div className="field-span-2">
              <span className="eyebrow">Step 2: Owner and practitioners</span>
              <h3>Add your team members</h3>
            </div>
            {data.practitioners.map((p, i) => (
              <div key={p.id} className="card onboarding-sub-card">
                <div className="onboarding-sub-card-header">
                  <strong>Practitioner {i + 1}</strong>
                  <button type="button" className="icon-action" onClick={() => removePractitioner(p.id)} aria-label="Remove practitioner">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="form-grid">
                  <label className="field"><span>Full name</span><input className="input" value={p.fullName} onChange={(e) => updatePractitioner(p.id, "fullName", e.target.value)} /></label>
                  <label className="field"><span>Professional title</span><input className="input" value={p.professionalTitle} onChange={(e) => updatePractitioner(p.id, "professionalTitle", e.target.value)} placeholder="e.g. Dr" /></label>
                  <label className="field"><span>Qualifications</span><input className="input" value={p.qualifications} onChange={(e) => updatePractitioner(p.id, "qualifications", e.target.value)} /></label>
                  <label className="field"><span>Registration number</span><input className="input" value={p.registrationNumber} onChange={(e) => updatePractitioner(p.id, "registrationNumber", e.target.value)} /></label>
                  <label className="field"><span>Email</span><input className="input" type="email" value={p.email} onChange={(e) => updatePractitioner(p.id, "email", e.target.value)} /></label>
                  <label className="field"><span>Phone</span><input className="input" type="tel" value={p.phone} onChange={(e) => updatePractitioner(p.id, "phone", e.target.value)} /></label>
                  <label className="toggle-label"><input type="checkbox" checked={p.canSignDocuments} onChange={(e) => updatePractitioner(p.id, "canSignDocuments", e.target.checked)} /><span>Can sign documents</span></label>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-light" onClick={addPractitioner}>
              <User size={15} /> Add practitioner
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="onboarding-step-content">
            <div className="field-span-2">
              <span className="eyebrow">Step 3: Locations</span>
              <h3>Add your practice locations</h3>
            </div>
            {data.locations.map((l, i) => (
              <div key={l.id} className="card onboarding-sub-card">
                <div className="onboarding-sub-card-header">
                  <strong>Location {i + 1}</strong>
                  <button type="button" className="icon-action" onClick={() => removeLocation(l.id)} aria-label="Remove location">✕</button>
                </div>
                <div className="form-grid">
                  <label className="field"><span>Branch name</span><input className="input" value={l.name} onChange={(e) => updateLocation(l.id, "name", e.target.value)} /></label>
                  <label className="field"><span>Physical address</span><input className="input" value={l.address} onChange={(e) => updateLocation(l.id, "address", e.target.value)} /></label>
                  <label className="field"><span>Town</span><input className="input" value={l.town} onChange={(e) => updateLocation(l.id, "town", e.target.value)} /></label>
                  <label className="field"><span>Region</span><input className="input" value={l.region} onChange={(e) => updateLocation(l.id, "region", e.target.value)} /></label>
                  <label className="field"><span>Phone</span><input className="input" type="tel" value={l.phone} onChange={(e) => updateLocation(l.id, "phone", e.target.value)} /></label>
                  <label className="field"><span>Email</span><input className="input" type="email" value={l.email} onChange={(e) => updateLocation(l.id, "email", e.target.value)} /></label>
                  <label className="toggle-label"><input type="checkbox" checked={l.public} onChange={(e) => updateLocation(l.id, "public", e.target.checked)} /><span>Visible publicly</span></label>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-light" onClick={addLocation}>
              <MapPin size={15} /> Add location
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="onboarding-step-content">
            <div className="field-span-2">
              <span className="eyebrow">Step 4: Services</span>
              <h3>Configure your services</h3>
              {data.practiceIdentity.practiceType && (
                <p className="onboarding-hint">
                  Showing templates for{" "}
                  {PRACTICE_TYPE_OPTIONS.find((o) => o.value === data.practiceIdentity.practiceType)?.label}
                </p>
              )}
            </div>
            {templatesForCategory.map((t) => (
              <div key={t.name} className="onboarding-template-row">
                <div className="onboarding-template-info">
                  <strong>{t.name}</strong>
                  <small>{t.description} · {t.durationMinutes} min</small>
                </div>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => addService(t.name, t.description, t.durationMinutes)}
                >
                  Add
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-light" onClick={() => addService()}>
              <Stethoscope size={15} /> Add custom service
            </button>
            {data.services.length > 0 && (
              <div className="onboarding-selected-services">
                <h4>Selected services ({data.services.length})</h4>
                {data.services.map((s) => (
                  <div key={s.id} className="record-row">
                    <div>
                      <b>{s.name || "New service"}</b>
                      <small>{s.description || ""}{s.price && ` · ${s.price}`}</small>
                    </div>
                    <div className="table-actions">
                      <input className="input" style={{ width: 80 }} type="number" value={s.durationMinutes} onChange={(e) => updateService(s.id, "durationMinutes", Number(e.target.value))} />
                      <button type="button" className="icon-action" onClick={() => removeService(s.id)} aria-label="Remove service">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="form-grid">
            <div className="field-span-2">
              <span className="eyebrow">Step 5: Operating information</span>
              <h3>Configure your availability</h3>
            </div>
            <label className="field field-span-2">
              <span>Working days</span>
              <div className="checkbox-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                {WEEKDAYS.map((day) => (
                  <label className="toggle-label" key={day.value}>
                    <input type="checkbox" checked={data.operatingInfo[`day_${day.value}`] === "true"} onChange={(e) => updateField("operatingInfo", `day_${day.value}`, e.target.checked ? "true" : "false")} />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </label>
            <label className="field"><span>Opening time</span><input className="input" type="time" value={data.operatingInfo.openTime || "08:00"} onChange={(e) => updateField("operatingInfo", "openTime", e.target.value)} /></label>
            <label className="field"><span>Closing time</span><input className="input" type="time" value={data.operatingInfo.closeTime || "17:00"} onChange={(e) => updateField("operatingInfo", "closeTime", e.target.value)} /></label>
            <label className="field"><span>Appointment duration (min)</span><input className="input" type="number" value={data.operatingInfo.durationMinutes || "30"} onChange={(e) => updateField("operatingInfo", "durationMinutes", e.target.value)} /></label>
            <label className="field"><span>Max advance booking (days)</span><input className="input" type="number" value={data.operatingInfo.maxAdvanceDays || "60"} onChange={(e) => updateField("operatingInfo", "maxAdvanceDays", e.target.value)} /></label>
            <label className="toggle-label field-span-2"><input type="checkbox" checked={data.operatingInfo.walkIns === "true"} onChange={(e) => updateField("operatingInfo", "walkIns", e.target.checked ? "true" : "false")} /><span>Accept walk-ins</span></label>
            <label className="field field-span-2"><span>Cancellation policy</span><textarea className="input" rows={2} value={data.operatingInfo.cancellationPolicy || ""} onChange={(e) => updateField("operatingInfo", "cancellationPolicy", e.target.value)} /></label>
          </div>
        )}

        {currentStep === 5 && (
          <div className="form-grid">
            <div className="field-span-2">
              <span className="eyebrow">Step 6: Medical and administrative setup</span>
              <h3>Configure your medical and admin settings</h3>
            </div>
            <label className="field field-span-2">
              <span>Accepted medical aids</span>
              <textarea className="input" rows={3} value={(data.medicalAdmin.medicalAids as string) || ""} onChange={(e) => updateField("medicalAdmin", "medicalAids", e.target.value)} placeholder="List the medical aids you accept" />
            </label>
            <label className="toggle-label"><input type="checkbox" checked={!!data.medicalAdmin.acceptsCash} onChange={(e) => updateField("medicalAdmin", "acceptsCash", e.target.checked)} /><span>Accept cash payments</span></label>
            <label className="toggle-label"><input type="checkbox" checked={!!data.medicalAdmin.acceptsCard} onChange={(e) => updateField("medicalAdmin", "acceptsCard", e.target.checked)} /><span>Accept card payments</span></label>
            <label className="toggle-label"><input type="checkbox" checked={!!data.medicalAdmin.acceptsEft} onChange={(e) => updateField("medicalAdmin", "acceptsEft", e.target.checked)} /><span>Accept EFT payments</span></label>
            <label className="toggle-label field-span-2"><input type="checkbox" checked={!!data.medicalAdmin.claimsEnabled} onChange={(e) => updateField("medicalAdmin", "claimsEnabled", e.target.checked)} /><span>Enable medical-aid claims</span></label>
            <label className="field field-span-2"><span>Consent wording</span><textarea className="input" rows={2} value={(data.medicalAdmin.consentWording as string) || ""} onChange={(e) => updateField("medicalAdmin", "consentWording", e.target.value)} /></label>
          </div>
        )}

        {currentStep === 6 && (
          <div className="form-grid">
            <div className="field-span-2">
              <span className="eyebrow">Step 7: Documents and branding</span>
              <h3>Configure your document identity</h3>
            </div>
            <label className="field"><span>Letterhead practice name</span><input className="input" value={(data.documentsBranding.letterheadName as string) || ""} onChange={(e) => updateField("documentsBranding", "letterheadName", e.target.value)} /></label>
            <label className="field"><span>Address block</span><input className="input" value={(data.documentsBranding.addressBlock as string) || ""} onChange={(e) => updateField("documentsBranding", "addressBlock", e.target.value)} /></label>
            <label className="field"><span>Contact block</span><input className="input" value={(data.documentsBranding.contactBlock as string) || ""} onChange={(e) => updateField("documentsBranding", "contactBlock", e.target.value)} /></label>
            <label className="field"><span>Invoice numbering prefix</span><input className="input" value={(data.documentsBranding.invoicePrefix as string) || ""} onChange={(e) => updateField("documentsBranding", "invoicePrefix", e.target.value)} placeholder="e.g. INV-" /></label>
            <label className="field"><span>QR verification URL</span><input className="input" value={(data.documentsBranding.verificationUrl as string) || ""} onChange={(e) => updateField("documentsBranding", "verificationUrl", e.target.value)} /></label>
            <label className="toggle-label field-span-2"><input type="checkbox" checked={!!data.documentsBranding.qrVerificationEnabled} onChange={(e) => updateField("documentsBranding", "qrVerificationEnabled", e.target.checked)} /><span>Enable QR code verification on certificates</span></label>
          </div>
        )}

        {currentStep === 7 && (
          <div className="onboarding-step-content">
            <div className="field-span-2">
              <span className="eyebrow">Step 8: Users and permissions</span>
              <h3>Invite your team members</h3>
            </div>
            {data.usersPermissions.map((u, i) => (
              <div key={u.id} className="card onboarding-sub-card">
                <div className="onboarding-sub-card-header">
                  <strong>Team member {i + 1}</strong>
                  <button type="button" className="icon-action" onClick={() => removeUserInvite(u.id)} aria-label="Remove user">✕</button>
                </div>
                <div className="form-grid">
                  <label className="field"><span>Name</span><input className="input" value={u.name} onChange={(e) => updateUserInvite(u.id, "name", e.target.value)} /></label>
                  <label className="field"><span>Email</span><input className="input" type="email" value={u.email} onChange={(e) => updateUserInvite(u.id, "email", e.target.value)} /></label>
                  <label className="field"><span>Role</span><CustomSelect value={u.role} onChange={(val) => updateUserInvite(u.id, "role", val)} options={USER_ROLES} /></label>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-light" onClick={addUserInvite}>
              <Users size={15} /> Invite team member
            </button>
          </div>
        )}

        {currentStep === 8 && (
          <div className="onboarding-review">
            <div className="field-span-2">
              <span className="eyebrow">Step 9: Review and submit</span>
              <h3>Review your onboarding information</h3>
            </div>
            <div className="onboarding-checklist">
              <div className={`checklist-item${data.practiceIdentity.name ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>Practice identity details</span>
              </div>
              <div className={`checklist-item${data.practitioners.length > 0 ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>At least one practitioner added</span>
              </div>
              <div className={`checklist-item${data.locations.length > 0 ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>At least one location configured</span>
              </div>
              <div className={`checklist-item${data.services.length > 0 ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>At least one service configured</span>
              </div>
              <div className={`checklist-item${data.operatingInfo.openTime ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>Operating hours configured</span>
              </div>
              <div className={`checklist-item${data.documentsBranding.letterheadName ? " completed" : ""}`}>
                <CheckCircle2 size={16} />
                <span>Document identity configured</span>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: 24 }}>
              <button type="button" className="btn btn-light" onClick={() => { autosave(); toast.success("Onboarding saved as draft"); }}>
                <Save size={15} /> Save as draft
              </button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={submitOnboarding}>
                {submitting ? <><Loader2 className="toast-spinner" size={16} /> Submitting…</> : <><ClipboardCheck size={16} /> Submit for verification</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        <button
          type="button"
          className="btn btn-light"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="onboarding-nav-right">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => { autosave(); toast.success("Progress saved"); }}
          >
            <SaveAll size={15} /> Save
          </button>
          {currentStep < STEPS.length - 1 && (
            <button type="button" className="btn btn-primary" onClick={nextStep}>
              Continue <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
