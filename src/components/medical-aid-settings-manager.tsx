"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Plus, Save, Settings2, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { money } from "@/lib/utils";

type Fund = {
  id: string;
  name: string;
  abbreviation: string | null;
  administrator: string | null;
  active: boolean;
  public: boolean;
  acceptedSubmissionMethods: string;
  coverSheetRequired: boolean;
  serviceDateRangeRequired: boolean;
  claimsEmail: string | null;
  supportEmail: string | null;
  phone: string | null;
  portalUrl: string | null;
  postalAddress: string | null;
  physicalAddress: string | null;
  submissionInstructions: string | null;
  sortOrder: number;
};
type Procedure = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultAmount: number;
  requiresNappiCode: boolean;
  requiresPreAuthorisation: boolean;
  active: boolean;
};
type Import = {
  id: string;
  versionName: string;
  sourceFilename: string;
  importedAt: string;
  importedRows: number;
  skippedRows: number;
  invalidRows: number;
  active: boolean;
};

const tabOptions = [
  ["FUNDS", "Medical-aid funds"],
  ["PROCEDURES", "Procedure items"],
  ["ICD10", "ICD-10 dataset"],
] as const;

function methodsFor(fund: Fund) {
  try {
    return JSON.parse(fund.acceptedSubmissionMethods || "[]") as string[];
  } catch {
    return [];
  }
}

function normalized(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function fundPayload(fund: Fund, overrides: Partial<Fund> = {}) {
  const value = { ...fund, ...overrides };
  return {
    entity: "FUND",
    id: value.id,
    name: value.name,
    abbreviation: value.abbreviation || value.name.slice(0, 6).toUpperCase(),
    administrator: value.administrator || null,
    claimsEmail: value.claimsEmail || "",
    supportEmail: value.supportEmail || "",
    phone: value.phone || null,
    portalUrl: value.portalUrl || "",
    postalAddress: value.postalAddress || null,
    physicalAddress: value.physicalAddress || null,
    submissionInstructions: value.submissionInstructions || null,
    acceptedSubmissionMethods: methodsFor(value).length ? methodsFor(value) : ["MANUAL"],
    coverSheetRequired: value.coverSheetRequired,
    serviceDateRangeRequired: value.serviceDateRangeRequired,
    active: value.active,
    public: value.public,
    sortOrder: value.sortOrder,
  };
}

export function MedicalAidSettingsManager({
  funds,
  procedures,
  imports,
}: {
  funds: Fund[];
  procedures: Procedure[];
  imports: Import[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabOptions)[number][0]>("FUNDS");
  const [saving, setSaving] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [creatingFund, setCreatingFund] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [creatingProcedure, setCreatingProcedure] = useState(false);
  const [fundSearch, setFundSearch] = useState("");
  const [fundStatus, setFundStatus] = useState("ALL");
  const [procedureSearch, setProcedureSearch] = useState("");
  const [procedureStatus, setProcedureStatus] = useState("ALL");
  const [procedureCategory, setProcedureCategory] = useState("ALL");

  const activeImport = imports.find((item) => item.active);
  const categories = useMemo(
    () => Array.from(new Set(procedures.map((item) => item.category).filter(Boolean) as string[])).sort(),
    [procedures],
  );
  const filteredFunds = funds.filter((fund) => {
    const haystack = `${fund.name} ${fund.abbreviation ?? ""}`.toLowerCase();
    const matchesSearch = haystack.includes(fundSearch.toLowerCase());
    const matchesStatus = fundStatus === "ALL" || (fundStatus === "ACTIVE" ? fund.active : !fund.active);
    return matchesSearch && matchesStatus;
  });
  const filteredProcedures = procedures.filter((item) => {
    const haystack = `${item.code} ${item.name}`.toLowerCase();
    const matchesSearch = haystack.includes(procedureSearch.toLowerCase());
    const matchesStatus = procedureStatus === "ALL" || (procedureStatus === "ACTIVE" ? item.active : !item.active);
    const matchesCategory = procedureCategory === "ALL" || item.category === procedureCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  async function patch(body: object, message: string, after?: () => void) {
    setSaving(true);
    const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/medical-aid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Medical-aid settings saved", { id: toastId });
      after?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function activateIcd10(item: Import) {
    const confirmation = window.prompt(`Type REPLACE ICD10 to activate ${item.versionName}. Historical claim snapshots will be preserved.`);
    if (confirmation !== "REPLACE ICD10") {
      toast.error("Activation cancelled.");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Activating ICD-10 dataset…");
    try {
      const response = await fetch("/api/icd10/import", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`${item.versionName} is now active`, { id: toastId });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not activate dataset", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function updateIcd10(item: Import) {
    const versionName = window.prompt("Dataset version", item.versionName);
    if (!versionName || versionName.trim() === item.versionName) return;
    setSaving(true);
    const toastId = toast.loading("Updating ICD-10 dataset…");
    try {
      const response = await fetch("/api/icd10/import", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, versionName: versionName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("ICD-10 dataset updated", { id: toastId });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update dataset", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function deleteIcd10(item: Import) {
    const confirmation = window.prompt(`Type DELETE ICD10 to delete ${item.versionName}. Active or historically referenced datasets are protected.`);
    if (confirmation !== "DELETE ICD10") {
      toast.error("Delete cancelled.");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Deleting ICD-10 dataset…");
    try {
      const response = await fetch("/api/icd10/import", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("ICD-10 dataset deleted", { id: toastId });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete dataset", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  function saveFund(event: FormEvent<HTMLFormElement>, fund?: Fund) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const abbreviation = String(data.get("abbreviation") || "").trim();
    const duplicate = funds.find(
      (item) => item.id !== fund?.id && normalized(item.abbreviation) === normalized(abbreviation),
    );
    if (duplicate) {
      toast.error(`Code ${abbreviation} already belongs to ${duplicate.name}.`);
      return;
    }
    patch(
      {
        entity: "FUND",
        id: fund?.id,
        name: data.get("name"),
        abbreviation,
        administrator: data.get("administrator") || null,
        claimsEmail: data.get("claimsEmail") || "",
        supportEmail: data.get("supportEmail") || "",
        phone: data.get("phone") || null,
        portalUrl: data.get("portalUrl") || "",
        postalAddress: data.get("postalAddress") || null,
        physicalAddress: data.get("physicalAddress") || null,
        submissionInstructions: data.get("submissionInstructions") || null,
        acceptedSubmissionMethods: [String(data.get("submissionMethod") || "MANUAL")],
        coverSheetRequired: data.has("coverSheetRequired"),
        serviceDateRangeRequired: data.has("serviceDateRangeRequired"),
        active: data.has("active"),
        public: data.has("public"),
        sortOrder: Number(data.get("sortOrder")),
      },
      "Saving fund…",
      () => {
        setEditingFund(null);
        setCreatingFund(false);
        form.reset();
      },
    );
  }

  function saveProcedure(event: FormEvent<HTMLFormElement>, item?: Procedure) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get("code") || "").trim();
    const duplicate = procedures.find((procedure) => procedure.id !== item?.id && normalized(procedure.code) === normalized(code));
    if (duplicate) {
      toast.error(`Procedure code ${code} already exists.`);
      return;
    }
    patch(
      {
        entity: "PROCEDURE",
        id: item?.id,
        code,
        name: data.get("name"),
        description: data.get("description") || null,
        category: data.get("category") || null,
        defaultAmount: Number(data.get("defaultAmount")),
        requiresNappiCode: data.has("requiresNappiCode"),
        requiresPreAuthorisation: data.has("requiresPreAuthorisation"),
        active: data.has("active"),
      },
      "Saving procedure…",
      () => {
        setEditingProcedure(null);
        setCreatingProcedure(false);
        form.reset();
      },
    );
  }

  return (
    <div className="medical-aid-settings">
      <nav className="settings-tabs" aria-label="Medical-aid settings sections">
        {tabOptions.map(([value, label]) => (
          <button className={tab === value ? "is-active" : ""} key={value} type="button" onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "FUNDS" && (
        <section className="card dashboard-card medical-settings-panel">
          <div className="manager-toolbar compact-toolbar">
            <div>
              <h2>Medical-aid funds</h2>
              <p>
                {filteredFunds.length} of {funds.length} funds shown. Referenced funds are disabled instead of deleted.
              </p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setCreatingFund(true)}>
              <Plus size={16} />
              Add fund
            </button>
          </div>
          <div className="filter-toolbar">
            <label className="search-box">
              <span>Search funds</span>
              <input value={fundSearch} onChange={(event) => setFundSearch(event.target.value)} placeholder="Name or code" />
            </label>
            <CustomSelect
              value={fundStatus}
              onChange={setFundStatus}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "DISABLED", label: "Disabled" },
              ]}
            />
          </div>
          <FundTable
            funds={filteredFunds}
            saving={saving}
            onEdit={setEditingFund}
            onToggle={(fund) => patch(fundPayload(fund, { active: !fund.active }), fund.active ? "Disabling fund…" : "Enabling fund…")}
          />
          {(creatingFund || editingFund) && (
            <ModalEditor title={editingFund ? `Manage ${editingFund.name}` : "Add medical-aid fund"} onClose={() => { setCreatingFund(false); setEditingFund(null); }}>
              <FundForm fund={editingFund ?? undefined} saving={saving} onSubmit={(event) => saveFund(event, editingFund ?? undefined)} />
            </ModalEditor>
          )}
        </section>
      )}

      {tab === "PROCEDURES" && (
        <section className="card dashboard-card medical-settings-panel">
          <div className="manager-toolbar compact-toolbar">
            <div>
              <h2>Procedure items</h2>
              <p>
                {filteredProcedures.length} of {procedures.length} procedure items shown. Do not invent tariffs or codes.
              </p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setCreatingProcedure(true)}>
              <Plus size={16} />
              Add procedure
            </button>
          </div>
          <div className="filter-toolbar">
            <label className="search-box">
              <span>Search procedures</span>
              <input value={procedureSearch} onChange={(event) => setProcedureSearch(event.target.value)} placeholder="Code or procedure" />
            </label>
            <CustomSelect
              value={procedureCategory}
              onChange={setProcedureCategory}
              options={[{ value: "ALL", label: "All categories" }, ...categories.map((category) => ({ value: category, label: category }))]}
            />
            <CustomSelect
              value={procedureStatus}
              onChange={setProcedureStatus}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "DISABLED", label: "Disabled" },
              ]}
            />
          </div>
          <ProcedureTable
            procedures={filteredProcedures}
            saving={saving}
            onEdit={setEditingProcedure}
            onToggle={(item) => patch({ entity: "PROCEDURE", ...item, active: !item.active }, item.active ? "Disabling procedure…" : "Enabling procedure…")}
          />
          {(creatingProcedure || editingProcedure) && (
            <ModalEditor title={editingProcedure ? `Edit ${editingProcedure.code}` : "Add procedure item"} onClose={() => { setCreatingProcedure(false); setEditingProcedure(null); }}>
              <ProcedureForm item={editingProcedure ?? undefined} saving={saving} onSubmit={(event) => saveProcedure(event, editingProcedure ?? undefined)} />
            </ModalEditor>
          )}
        </section>
      )}

      {tab === "ICD10" && (
        <section className="card dashboard-card medical-settings-panel">
          <div className="settings-card-heading">
            <h2>ICD-10 dataset</h2>
            <p className="muted">Owner-only server import. New workbooks are validated and saved as inactive until explicit replacement activation is enabled.</p>
          </div>
          <div className="icd-summary-grid">
            <div>
              <span>Active dataset version</span>
              <b>{activeImport?.versionName || "MIT 2021 (16 March 2021)"}</b>
            </div>
            <div>
              <span>Filename</span>
              <b>{activeImport?.sourceFilename || "ICD-10_MIT_2021_Excel_16-March_2021.xlsx"}</b>
            </div>
            <div>
              <span>Code count</span>
              <b>{(activeImport?.importedRows || 41008).toLocaleString()} codes</b>
            </div>
            <div>
              <span>Active status</span>
              <b>{activeImport ? "Active" : "Baseline reference"}</b>
            </div>
          </div>
          <form
            className="icd-import-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              const toastId = toast.loading("Validating ICD-10 workbook…");
              try {
                const response = await fetch("/api/icd10/import", { method: "POST", body: new FormData(event.currentTarget) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                toast.success(`${data.importedRows.toLocaleString()} valid codes saved inactive. Review before activation.`, { id: toastId });
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Validation failed", { id: toastId });
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="field">
              <span>Dataset version</span>
              <input className="input" name="versionName" defaultValue="MIT 2021 (16 March 2021)" required />
            </label>
            <div className="field custom-upload-field">
              <span>XLSX workbook</span>
              <label className="custom-upload">
                <input
                  type="file"
                  name="file"
                  accept=".xlsx"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const name = event.currentTarget.parentElement?.querySelector("strong");
                    if (name) name.textContent = file?.name || "Choose an XLSX workbook";
                  }}
                />
                <strong>Choose an XLSX workbook</strong>
                <small>Validation checks required columns, invalid rows and duplicates.</small>
              </label>
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="toast-spinner" size={16} /> : <Upload size={16} />}
              Validate workbook
            </button>
          </form>
          <div className="import-history">
            {imports.map((item) => (
              <article key={item.id}>
                <Database size={18} />
                <div>
                  <b>{item.versionName}</b>
                  <span>{item.sourceFilename}</span>
                </div>
                <div>
                  <b>{item.importedRows.toLocaleString()} valid</b>
                  <span>{item.invalidRows} invalid · {item.skippedRows} duplicate/skipped</span>
                </div>
                <div className="table-actions">
                  {item.active ? (
                    <span className="account-status">Active</span>
                  ) : (
                    <button className="btn btn-light" type="button" disabled={saving || !item.importedRows} onClick={() => activateIcd10(item)}>
                      Import and activate
                    </button>
                  )}
                  <button className="btn btn-light" type="button" disabled={saving} onClick={() => updateIcd10(item)}>Update</button>
                  <button className="icon-action danger-action" type="button" disabled={saving || item.active} aria-label={`Delete ${item.versionName}`} onClick={() => deleteIcd10(item)}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FundTable({
  funds,
  saving,
  onEdit,
  onToggle,
}: {
  funds: Fund[];
  saving: boolean;
  onEdit: (fund: Fund) => void;
  onToggle: (fund: Fund) => void;
}) {
  if (!funds.length) return <p className="empty-copy">No medical-aid funds match the current filters.</p>;
  return (
    <div className="table-scroll">
      <table className="data-table compact-data-table">
        <thead>
          <tr>
            <th>Fund</th>
            <th>Code</th>
            <th>Claim method</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund) => {
            const methods = methodsFor(fund);
            const setupNeeded = !methods.length || !fund.claimsEmail && !fund.portalUrl && !fund.submissionInstructions;
            return (
              <tr key={fund.id}>
                <td>
                  <b>{fund.name}</b>
                  <small>{fund.administrator || "Not configured"}</small>
                </td>
                <td>{fund.abbreviation || "—"}</td>
                <td>{methods.join(", ") || "Not configured"}</td>
                <td>
                  <span className={`account-status${fund.active ? "" : " is-muted"}`}>{fund.active ? "Active" : "Disabled"}</span>
                  {setupNeeded && <small className="setup-needed">Setup needed</small>}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-light" type="button" onClick={() => onEdit(fund)}>
                      <Settings2 size={15} />
                      Manage
                    </button>
                    <button className="btn btn-light" type="button" disabled={saving} onClick={() => onToggle(fund)}>
                      {fund.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProcedureTable({
  procedures,
  saving,
  onEdit,
  onToggle,
}: {
  procedures: Procedure[];
  saving: boolean;
  onEdit: (item: Procedure) => void;
  onToggle: (item: Procedure) => void;
}) {
  if (!procedures.length) return <p className="empty-copy">No procedure items match the current filters.</p>;
  return (
    <div className="table-scroll">
      <table className="data-table compact-data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Procedure</th>
            <th>Category</th>
            <th>Default amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {procedures.map((item) => (
            <tr key={item.id}>
              <td>
                <b>{item.code}</b>
              </td>
              <td>
                <b>{item.name}</b>
                <small>{item.description || "No description"}</small>
              </td>
              <td>{item.category || "Uncategorised"}</td>
              <td>{money(item.defaultAmount)}</td>
              <td>
                <span className={`account-status${item.active ? "" : " is-muted"}`}>{item.active ? "Active" : "Disabled"}</span>
              </td>
              <td>
                <div className="table-actions">
                  <button className="btn btn-light" type="button" onClick={() => onEdit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-light" type="button" disabled={saving} onClick={() => onToggle(item)}>
                    {item.active ? "Disable" : "Enable"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModalEditor({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="medical-aid-editor-title">
      <button className="appointment-modal-backdrop" aria-label="Close medical aid editor" onClick={onClose} />
      <div className="appointment-panel medical-aid-editor-panel">
        <div className="appointment-panel-heading">
          <div><span className="eyebrow">Medical aid setup</span><h2 id="medical-aid-editor-title">{title}</h2></div>
          <button type="button" aria-label="Close medical aid editor" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" name={name} type={type} defaultValue={value ?? ""} required={required} step={type === "number" ? ".01" : undefined} />
    </label>
  );
}

function FundForm({ fund, saving, onSubmit }: { fund?: Fund; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const methods = fund ? methodsFor(fund) : ["MANUAL"];
  const [method, setMethod] = useState(methods[0] || "MANUAL");
  return (
    <form className="directory-admin-form" onSubmit={onSubmit}>
      <div className="directory-form-grid">
        <TextField name="name" label="Fund" value={fund?.name} required />
        <TextField name="abbreviation" label="Code" value={fund?.abbreviation} required />
        <TextField name="administrator" label="Administrator" value={fund?.administrator} />
        <label className="field">
          <span>Claim method</span>
          <CustomSelect
            name="submissionMethod"
            value={method}
            onChange={setMethod}
            options={["MANUAL", "EMAIL", "PORTAL", "MEDISWITCH", "EDI", "OTHER"].map((value) => ({ value, label: value }))}
          />
        </label>
        <TextField name="claimsEmail" label="Claims email" type="email" value={fund?.claimsEmail} />
        <TextField name="supportEmail" label="Provider support email" type="email" value={fund?.supportEmail} />
        <TextField name="phone" label="Contact number" value={fund?.phone} />
        <TextField name="portalUrl" label="Portal URL" type="url" value={fund?.portalUrl} />
        <TextField name="postalAddress" label="Postal address" value={fund?.postalAddress} />
        <TextField name="physicalAddress" label="Physical address" value={fund?.physicalAddress} />
        <TextField name="sortOrder" label="Sort order" type="number" value={fund?.sortOrder ?? 0} required />
        <label className="field directory-wide">
          <span>Submission instructions</span>
          <textarea className="input" name="submissionInstructions" defaultValue={fund?.submissionInstructions ?? ""} />
        </label>
        {[
          { name: "coverSheetRequired", label: "Cover sheet required", checked: fund?.coverSheetRequired ?? false },
          { name: "serviceDateRangeRequired", label: "Service-date range required", checked: fund?.serviceDateRangeRequired ?? false },
          { name: "active", label: "Active", checked: fund?.active ?? true },
          { name: "public", label: "Public booking option", checked: fund?.public ?? true },
        ].map((item) => (
          <label className="toggle-label" key={item.name}>
            <input type="checkbox" name={item.name} defaultChecked={item.checked} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      <div className="manager-actions">
        <button className="btn btn-primary directory-save" disabled={saving}>
          <Save size={16} />
          Save fund
        </button>
      </div>
    </form>
  );
}

function ProcedureForm({ item, saving, onSubmit }: { item?: Procedure; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="directory-admin-form" onSubmit={onSubmit}>
      <div className="directory-form-grid">
        <TextField name="code" label="Code" value={item?.code} required />
        <TextField name="name" label="Name" value={item?.name} required />
        <TextField name="category" label="Category" value={item?.category} />
        <TextField name="defaultAmount" label="Default amount in N$" type="number" value={item?.defaultAmount ?? 0} required />
        <label className="field directory-wide">
          <span>Description</span>
          <textarea className="input" name="description" defaultValue={item?.description ?? ""} />
        </label>
        {[
          { name: "requiresNappiCode", label: "Requires NAPPI code", checked: item?.requiresNappiCode ?? false },
          { name: "requiresPreAuthorisation", label: "Requires pre-authorisation", checked: item?.requiresPreAuthorisation ?? false },
          { name: "active", label: "Active", checked: item?.active ?? true },
        ].map((value) => (
          <label className="toggle-label" key={value.name}>
            <input type="checkbox" name={value.name} defaultChecked={value.checked} />
            <span>{value.label}</span>
          </label>
        ))}
      </div>
      <div className="manager-actions">
        <button className="btn btn-primary directory-save" disabled={saving}>
          <Save size={16} />
          Save procedure
        </button>
      </div>
    </form>
  );
}
