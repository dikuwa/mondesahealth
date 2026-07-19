"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmergencyAiSettings, type EmergencyContactRow } from "@/components/emergency-ai-settings";
import { isEditableSettingsSection, settingsPayloadForSection } from "@/lib/settings-payload";

type Setting = {
  practiceName: string;
  doctorName: string;
  practiceNumber: string;
  registrationNumber: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  currency: string;
  signatureName: string;
  signatureTitle: string;
  vatEnabled: boolean;
  tagline: string;
  publicDescription: string;
  locationNote: string;
  mapsUrl: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  publicHours: string | null;
  showEmail: boolean;
  showWhatsapp: boolean;
  claimContactName: string;
  claimPhone: string;
  claimEmail: string;
  claimPostalAddress: string;
  consentWording: string;
  aiIntakeEnabled: boolean;
  aiImageEnabled: boolean;
};

type Fund = {
  id: string;
  name: string;
  abbreviation: string | null;
  administrator: string | null;
  public: boolean;
  active: boolean;
};

type Counts = {
  patients: number;
  appointments: number;
  invoices: number;
  payments: number;
  claims: number;
  batches: number;
  attachments: number;
  activity: number;
};

const tabs = [
  ["practice", "Practice"],
  ["documents", "Documents"],
  ["public-site", "Public site"],
  ["claims", "Claims"],
  ["medical-aids", "Medical aids"],
  ["emergency-ai", "Emergency & AI"],
  ["data-reset", "Data reset"],
] as const;

type Tab = (typeof tabs)[number][0];

function sameSettings(a: Setting, b: Setting) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function fieldId(name: string) {
  return `setting-${name}`;
}

function pickTab(value: string | null): Tab {
  return tabs.some(([tab]) => tab === value) ? (value as Tab) : "practice";
}

export function SettingsManager({
  setting,
  funds,
  isOwner,
  storage,
  emergencyContacts,
}: {
  setting: Setting;
  funds: Fund[];
  isOwner: boolean;
  storage: {count:number;bytes:number;limitMb:number};
  emergencyContacts: EmergencyContactRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => pickTab(searchParams.get("tab")));
  const [draft, setDraft] = useState<Setting>(setting);
  const [saved, setSaved] = useState<Setting>(setting);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "error">("saved");
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const hasChanges = !sameSettings(draft, saved);

  useEffect(() => {
    const preventLeaving = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [hasChanges]);

  function update<K extends keyof Setting>(key: K, value: Setting[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (saveState === "error") setSaveState("unsaved");
  }

  function changeTab(next: Tab) {
    if (next === activeTab) return;
    if (hasChanges) {
      setPendingTab(next);
      return;
    }
    openTab(next);
  }

  function openTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
    setActiveTab(next);
  }

  function discardAndChangeTab() {
    if (!pendingTab) return;
    setDraft(saved);
    setSaveState("saved");
    openTab(pendingTab);
    setPendingTab(null);
    toast.success("Unsaved settings discarded");
  }

  async function saveActiveTab() {
    if (!isEditableSettingsSection(activeTab)) return;
    setSaving(true);
    const id = toast.loading(`Saving ${tabs.find(([tab]) => tab === activeTab)?.[1].toLowerCase()} settings…`);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayloadForSection(activeTab, draft)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved(draft);
      setSaveState("saved");
      toast.success("Settings saved", { id });
      router.refresh();
    } catch (error) {
      setSaveState("error");
      toast.error(error instanceof Error ? error.message : "Could not save settings", { id });
    } finally {
      setSaving(false);
    }
  }

  const effectiveSaveState = saveState === "error" ? "error" : hasChanges ? "unsaved" : "saved";
  const activeLabel = tabs.find(([tab]) => tab === activeTab)?.[1] || "Settings";
  const saveButtonLabel = activeTab === "practice" ? "Save practice settings" : `Save ${activeLabel.toLowerCase()} settings`;
  const saveLabel = saving
    ? "Saving…"
    : effectiveSaveState === "error"
      ? "Error"
    : hasChanges
      ? "Unsaved"
        : "Saved";

  return (
    <div className="settings-workspace">
      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map(([value, label]) => (
          <button
            className={activeTab === value ? "is-active" : ""}
            key={value}
            type="button"
            onClick={() => changeTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="settings-summary-strip">
        <SummaryItem label="Practice" value={draft.practiceNumber.includes("Pending") || draft.registrationNumber.includes("Pending") ? "Needs details" : "Configured"} warning={draft.practiceNumber.includes("Pending") || draft.registrationNumber.includes("Pending")} />
        <SummaryItem label="Documents" value={draft.currency || "NAD"} />
        <SummaryItem label="Public site" value={draft.tagline ? "Configured" : "Needs details"} warning={!draft.tagline} />
        <SummaryItem label="Claims" value={draft.claimContactName && draft.claimPhone ? "Configured" : "Needs details"} warning={!draft.claimContactName || !draft.claimPhone} />
        <SummaryItem label="Medical aids" value={`${funds.filter((fund) => fund.active).length} active`} />
        <SummaryItem label="Protected storage" value={`${storage.count} files · ${(storage.bytes/1024/1024).toFixed(1)} / ${storage.limitMb} MB`} warning={storage.bytes>storage.limitMb*1024*1024*.9}/>
      </div>

      <section className="card dashboard-card settings-panel">
        {activeTab === "practice" && <PracticeTab draft={draft} update={update} />}
        {activeTab === "documents" && <DocumentsTab draft={draft} update={update} />}
        {activeTab === "public-site" && <PublicSiteTab draft={draft} update={update} />}
        {activeTab === "claims" && <ClaimsTab draft={draft} update={update} />}
        {activeTab === "medical-aids" && <MedicalAidsTab funds={funds} saving={saving} />}
        {activeTab === "emergency-ai" && <EmergencyAiSettings initialContacts={emergencyContacts} initialAiEnabled={setting.aiIntakeEnabled} initialImageEnabled={setting.aiImageEnabled} />}
        {activeTab === "data-reset" && <DataResetTab isOwner={isOwner} />}

        {activeTab !== "data-reset" && activeTab !== "emergency-ai" && (
          <div className="form-action-bar">
            <button className="btn btn-light" type="button" disabled={saving || !hasChanges} onClick={() => setDraft(saved)}>
              Discard changes
            </button>
            <div className={`settings-save-state is-${effectiveSaveState}`}>
              {saving ? <Loader2 className="toast-spinner" size={16} /> : <CheckCircle2 size={16} />}
              {saveLabel}
            </div>
            <button className="btn btn-primary" type="button" disabled={saving || !hasChanges} onClick={saveActiveTab}>
              {saving ? <Loader2 className="toast-spinner" size={17} /> : <Save size={17} />}
              {saveButtonLabel}
            </button>
          </div>
        )}
      </section>
      <ConfirmationDialog
        open={Boolean(pendingTab)}
        title="Discard unsaved settings?"
        description="Your changes on this settings section have not been saved. Discard them and continue to the selected section?"
        confirmLabel="Discard and continue"
        danger
        busy={false}
        onCancel={() => setPendingTab(null)}
        onConfirm={discardAndChangeTab}
      />
    </div>
  );
}

function SummaryItem({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  const Icon = warning ? AlertTriangle : CheckCircle2;
  return (
    <div className={`settings-summary-item${warning ? " is-warning" : ""}`}>
      <Icon size={18} />
      <span><b>{label}</b><small>{value}</small></span>
    </div>
  );
}

function TextField({
  name,
  label,
  draft,
  update,
  type = "text",
  required = false,
}: {
  name: keyof Setting;
  label: string;
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field" htmlFor={fieldId(name)}>
      <span>{label}</span>
      <input
        id={fieldId(name)}
        className="input"
        name={name}
        type={type}
        value={String(draft[name] ?? "")}
        required={required}
        onChange={(event) => update(name, event.target.value as Setting[typeof name])}
      />
    </label>
  );
}

function NumberField({
  name,
  label,
  draft,
  update,
  min,
  max,
}: {
  name: "mapLatitude" | "mapLongitude";
  label: string;
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="field" htmlFor={fieldId(name)}>
      <span>{label}</span>
      <input
        id={fieldId(name)}
        className="input"
        name={name}
        type="number"
        min={min}
        max={max}
        step="any"
        value={draft[name] ?? ""}
        onChange={(event) => update(name, event.target.value === "" ? null : Number(event.target.value))}
      />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  draft,
  update,
  required = false,
}: {
  name: keyof Setting;
  label: string;
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
  required?: boolean;
}) {
  return (
    <label className="field settings-wide" htmlFor={fieldId(name)}>
      <span>{label}</span>
      <textarea
        id={fieldId(name)}
        className="input"
        name={name}
        value={String(draft[name] ?? "")}
        required={required}
        onChange={(event) => update(name, event.target.value as Setting[typeof name])}
      />
    </label>
  );
}

function ToggleField({
  name,
  label,
  draft,
  update,
}: {
  name: "vatEnabled" | "showEmail" | "showWhatsapp";
  label: string;
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
}) {
  return (
    <label className="toggle-label settings-checkbox-row">
      <input type="checkbox" checked={Boolean(draft[name])} onChange={(event) => update(name, event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function PracticeTab({
  draft,
  update,
}: {
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
}) {
  return (
    <>
      <div className="settings-card-heading">
        <h2>Practice</h2>
        <p className="muted">Compact practice identity and contact details used throughout the dashboard and documents.</p>
      </div>
      <div className="settings-section-grid">
        <section>
          <h3>Practice details</h3>
          <div className="settings-fields">
            <TextField name="practiceName" label="Practice" draft={draft} update={update} required />
            <TextField name="doctorName" label="Practitioner" draft={draft} update={update} required />
            <TextField name="practiceNumber" label="Practice number" draft={draft} update={update} required />
            <TextField name="registrationNumber" label="Registration" draft={draft} update={update} required />
          </div>
        </section>
        <section>
          <h3>Contact details</h3>
          <div className="settings-fields">
            <TextField name="phone" label="Phone" draft={draft} update={update} required />
            <TextField name="whatsapp" label="WhatsApp" draft={draft} update={update} required />
            <TextField name="email" label="Email" type="email" draft={draft} update={update} required />
            <TextField name="address" label="Address" draft={draft} update={update} required />
          </div>
        </section>
      </div>
    </>
  );
}

function DocumentsTab({
  draft,
  update,
}: {
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
}) {
  return (
    <>
      <div className="settings-card-heading">
        <h2>Documents</h2>
        <p className="muted">Shared by invoices, receipts, quotations, claim documents, statements and batch summaries. Currency defaults to NAD and displays as N$.</p>
      </div>
      <div className="settings-fields settings-document-fields">
        <TextField name="currency" label="Currency" draft={draft} update={update} required />
        <TextField name="signatureName" label="Signatory" draft={draft} update={update} required />
        <TextField name="signatureTitle" label="Signatory title" draft={draft} update={update} required />
        <ToggleField name="vatEnabled" label="VAT enabled" draft={draft} update={update} />
      </div>
    </>
  );
}

function PublicSiteTab({
  draft,
  update,
}: {
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
}) {
  return (
    <>
      <div className="settings-card-heading">
        <h2>Public site</h2>
        <p className="muted">Saved values update the real public website content, contact visibility, location copy and map link.</p>
      </div>
      <div className="settings-fields settings-public-fields">
        <TextField name="tagline" label="Tagline" draft={draft} update={update} required />
        <TextAreaField name="publicDescription" label="Public description" draft={draft} update={update} required />
        <TextField name="locationNote" label="Location note" draft={draft} update={update} />
        <TextField name="mapsUrl" label="Google Maps URL" type="url" draft={draft} update={update} />
        <NumberField name="mapLatitude" label="Latitude" min={-90} max={90} draft={draft} update={update} />
        <NumberField name="mapLongitude" label="Longitude" min={-180} max={180} draft={draft} update={update} />
        <TextAreaField name="publicHours" label="Opening hours" draft={draft} update={update} />
      </div>
      <div className="settings-visibility">
        <ToggleField name="showEmail" label="Show email publicly" draft={draft} update={update} />
        <ToggleField name="showWhatsapp" label="Show WhatsApp publicly" draft={draft} update={update} />
      </div>
    </>
  );
}

function ClaimsTab({
  draft,
  update,
}: {
  draft: Setting;
  update: <K extends keyof Setting>(key: K, value: Setting[K]) => void;
}) {
  return (
    <>
      <div className="settings-card-heading">
        <h2>Claims</h2>
        <p className="muted">Used in claim validation, claim exports and batch documents.</p>
      </div>
      <div className="settings-fields settings-public-fields">
        <TextField name="claimContactName" label="Claim contact person" draft={draft} update={update} />
        <TextField name="claimPhone" label="Claim telephone" draft={draft} update={update} />
        <TextField name="claimEmail" label="Claim email" type="email" draft={draft} update={update} />
        <TextField name="claimPostalAddress" label="Postal address" draft={draft} update={update} />
        <TextAreaField name="consentWording" label="ICD-10 disclosure consent wording" draft={draft} update={update} required />
      </div>
    </>
  );
}

function MedicalAidsTab({ funds, saving }: { funds: Fund[]; saving: boolean }) {
  const router = useRouter();
  const [busyFund, setBusyFund] = useState<string | null>(null);
  async function updateFund(fund: Fund, patch: Partial<Fund>) {
    setBusyFund(fund.id);
    const id = toast.loading("Updating medical aid…");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicalAidId: fund.id,
          active: patch.active ?? fund.active,
          public: patch.public ?? fund.public,
          administrator: fund.administrator,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Medical aid updated", { id });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update medical aid", { id });
    } finally {
      setBusyFund(null);
    }
  }
  return (
    <>
      <div className="settings-card-heading">
        <h2>Medical aids</h2>
        <p className="muted">Compact visibility controls. Detailed fund setup stays on the Medical Aid configuration page.</p>
      </div>
      <div className="table-scroll">
        <table className="data-table settings-funds-table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Administrator</th>
              <th>Public</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((fund) => (
              <tr key={fund.id}>
                <td>
                  <b>{fund.name}</b>
                  <small>{fund.abbreviation || "No code"}</small>
                </td>
                <td>{fund.administrator || "Not configured"}</td>
                <td>
                  <input
                    aria-label={`${fund.name} public`}
                    checked={fund.public}
                    disabled={saving || busyFund === fund.id}
                    type="checkbox"
                    onChange={(event) => updateFund(fund, { public: event.target.checked })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${fund.name} active`}
                    checked={fund.active}
                    disabled={saving || busyFund === fund.id}
                    type="checkbox"
                    onChange={(event) => updateFund(fund, { active: event.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DataResetTab({ isOwner }: { isOwner: boolean }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [secondConfirm, setSecondConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Counts | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    fetch("/api/practice/reset-preview")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data?.counts && setCounts(data.counts))
      .catch(() => undefined);
  }, [isOwner]);

  const total = useMemo(
    () =>
      counts
        ? counts.patients +
          counts.appointments +
          counts.invoices +
          counts.payments +
          counts.claims +
          counts.batches +
          counts.attachments
        : 0,
    [counts],
  );

  async function reset() {
    setBusy(true);
    try {
      const response = await fetch("/api/practice/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCounts(data.counts);
      setResult(data.counts);
      setConfirmation("");
      setSecondConfirm(false);
      toast.success("Practice reset completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reset could not be completed");
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="settings-card-heading">
        <h2>Data reset</h2>
        <p className="muted">Only the practice owner can view or run this destructive workflow.</p>
      </div>
    );
  }

  return (
    <>
      <div className="settings-card-heading">
        <h2>
          <AlertTriangle size={19} /> Data reset
        </h2>
        <p className="muted">
          This removes operational records while preserving staff accounts, reference datasets, availability rules, and the complete services and providers directory. Departments, services, and provider profiles remain available for manual editing or deletion.
        </p>
      </div>
      {counts && (
        <div className="reset-counts">
          {[
            ["Patients", counts.patients],
            ["Appointments", counts.appointments],
            ["Invoices / payments", counts.invoices + counts.payments],
            ["Claims / batches", counts.claims + counts.batches],
            ["Attachments", counts.attachments],
            ["Activity entries", counts.activity],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="reset-result">
          <b>Reset completed.</b>
          <span>{result.patients + result.appointments + result.claims + result.invoices} operational records remain after reset.</span>
        </div>
      )}
      <label className="field settings-reset-confirm" htmlFor="reset-confirmation">
        <span>Type RESET MONDESA</span>
        <input
          id="reset-confirmation"
          className="input"
          value={confirmation}
          placeholder="RESET MONDESA"
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <button
        className="btn btn-danger"
        type="button"
        disabled={!counts || total === 0 || confirmation !== "RESET MONDESA"}
        onClick={() => setSecondConfirm(true)}
      >
        <RotateCcw size={16} />
        Start from scratch
      </button>
      <ConfirmationDialog
        open={secondConfirm}
        title="Reset this practice now?"
        description="This is the second confirmation. Operational records, documents, patients, appointments, claims, payments, attachments, and activity entries will be removed. The complete services and providers directory, staff accounts, and reference datasets are preserved."
        confirmLabel="Yes, reset now"
        danger
        busy={busy}
        onCancel={() => setSecondConfirm(false)}
        onConfirm={reset}
      />
    </>
  );
}
