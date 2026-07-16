"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type Fund = { id: string; name: string; abbreviation: string | null; administrator: string | null; active: boolean; public: boolean; acceptedSubmissionMethods: string; coverSheetRequired: boolean; serviceDateRangeRequired: boolean; claimsEmail: string | null; supportEmail: string | null; phone: string | null; portalUrl: string | null; postalAddress: string | null; physicalAddress: string | null; submissionInstructions: string | null; sortOrder: number };
type Procedure = { id: string; code: string; name: string; description: string | null; category: string | null; defaultAmount: number; requiresNappiCode: boolean; requiresPreAuthorisation: boolean; active: boolean };
type Import = { id: string; versionName: string; sourceFilename: string; importedAt: string; importedRows: number; skippedRows: number; invalidRows: number; active: boolean };

export function MedicalAidSettingsManager({ funds, procedures, imports }: { funds: Fund[]; procedures: Procedure[]; imports: Import[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("FUNDS");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ entity: "FUND" | "PROCEDURE"; id: string; label: string } | null>(null);

  async function patch(body: object, message: string, form?: HTMLFormElement) {
    setSaving(true);
    const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/medical-aid", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Medical-aid settings saved", { id: toastId });
      form?.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings", { id: toastId });
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    try { const response = await fetch("/api/medical-aid", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingDelete) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success(`${pendingDelete.label} deleted`); setPendingDelete(null); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete item"); }
    finally { setSaving(false); }
  }

  function saveFund(event: FormEvent<HTMLFormElement>, fund?: Fund) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    patch({
      entity: "FUND", id: fund?.id, name: data.get("name"), abbreviation: data.get("abbreviation"), administrator: data.get("administrator") || null,
      claimsEmail: data.get("claimsEmail") || "", supportEmail: data.get("supportEmail") || "", phone: data.get("phone") || null, portalUrl: data.get("portalUrl") || "",
      postalAddress: data.get("postalAddress") || null, physicalAddress: data.get("physicalAddress") || null, submissionInstructions: data.get("submissionInstructions") || null,
      acceptedSubmissionMethods: [String(data.get("submissionMethod") || "MANUAL")], coverSheetRequired: data.has("coverSheetRequired"), serviceDateRangeRequired: data.has("serviceDateRangeRequired"),
      active: data.has("active"), public: data.has("public"), sortOrder: Number(data.get("sortOrder")),
    }, "Saving fund…", fund ? undefined : form);
  }

  function saveProcedure(event: FormEvent<HTMLFormElement>, item?: Procedure) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    patch({ entity: "PROCEDURE", id: item?.id, code: data.get("code"), name: data.get("name"), description: data.get("description") || null, category: data.get("category") || null, defaultAmount: Number(data.get("defaultAmount")), requiresNappiCode: data.has("requiresNappiCode"), requiresPreAuthorisation: data.has("requiresPreAuthorisation"), active: data.has("active") }, "Saving procedure…", item ? undefined : form);
  }

  return <div className="medical-aid-settings">
    <nav className="settings-tabs" aria-label="Medical-aid settings sections">
      {[["FUNDS", "Medical-aid funds"], ["PROCEDURES", "Procedure items"], ["ICD10", "ICD-10 dataset"]].map(([value, label]) => <button className={tab === value ? "is-active" : ""} key={value} onClick={() => setTab(value)}>{label}</button>)}
    </nav>

    {tab === "FUNDS" && <div className="medical-aid-admin-list">
      <div className="manager-toolbar"><div><h2>Medical-aid funds</h2><p>Provider-neutral configuration. Disable referenced funds instead of deleting them.</p></div></div>
      {funds.map((fund) => <details className="card dashboard-card directory-admin-department" key={fund.id}>
        <summary><span><strong>{fund.name}</strong><small>{fund.abbreviation} · {fund.active ? "Active" : "Disabled"}</small></span><span>{JSON.parse(fund.acceptedSubmissionMethods || "[]").join(", ") || "No method"}</span></summary>
        <FundForm fund={fund} saving={saving} onSubmit={(event) => saveFund(event, fund)} onDelete={() => setPendingDelete({ entity: "FUND", id: fund.id, label: fund.name })} />
      </details>)}
      <details className="card dashboard-card directory-admin-department"><summary><span><strong>Add medical-aid fund</strong><small>Create an editable provider configuration.</small></span><Plus size={17} /></summary><FundForm saving={saving} onSubmit={saveFund} /></details>
    </div>}

    {tab === "PROCEDURES" && <div className="medical-aid-admin-list">
      <div className="manager-toolbar"><div><h2>Procedure items</h2><p>Enter only authorised procedure and tariff information.</p></div></div>
      {procedures.map((item) => <details className="card dashboard-card directory-admin-department" key={item.id}><summary><span><strong>{item.code} · {item.name}</strong><small>N$ {item.defaultAmount.toFixed(2)} · {item.active ? "Active" : "Disabled"}</small></span></summary><ProcedureForm item={item} saving={saving} onSubmit={(event) => saveProcedure(event, item)} onDelete={() => setPendingDelete({ entity: "PROCEDURE", id: item.id, label: item.name })} /></details>)}
      <details className="card dashboard-card directory-admin-department"><summary><span><strong>Add procedure item</strong><small>Manual procedure catalogue entry.</small></span><Plus size={17} /></summary><ProcedureForm saving={saving} onSubmit={saveProcedure} /></details>
    </div>}

    {tab === "ICD10" && <section className="card dashboard-card">
      <div className="settings-card-heading"><h2>ICD-10 dataset</h2><p className="muted">Owner-only server-side import. Historical claim snapshots remain unchanged.</p></div>
      <form className="icd-import-form" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); const toastId = toast.loading("Importing ICD-10 workbook…");
        try { const response = await fetch("/api/icd10/import", { method: "POST", body: new FormData(event.currentTarget) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success(`${data.importedRows} ICD-10 codes imported`, { id: toastId }); router.refresh(); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Import failed", { id: toastId }); }
        finally { setSaving(false); }
      }}>
        <label className="field"><span>Dataset version</span><input className="input" name="versionName" defaultValue="MIT 2021 (16 March 2021)" required /></label>
        <label className="field"><span>XLSX workbook</span><input className="input" type="file" name="file" accept=".xlsx" required /></label>
        <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={16} /> : <Upload size={16} />}Import dataset</button>
      </form>
      <div className="import-history">{imports.map((item) => <article key={item.id}><Database size={18} /><div><b>{item.versionName}</b><span>{item.sourceFilename}</span></div><div><b>{item.importedRows.toLocaleString()} codes</b><span>{item.invalidRows} invalid · {item.skippedRows} skipped</span></div><span className="account-status">{item.active ? "Active" : "Historical"}</span></article>)}</div>
    </section>}
      <ConfirmationDialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.label || "item"}?`} description="The item will be permanently removed if no records reference it. Referenced items must be disabled instead." confirmLabel="Delete permanently" danger busy={saving} onCancel={() => setPendingDelete(null)} onConfirm={remove} />
  </div>;
}

function TextField({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean }) { return <label className="field"><span>{label}</span><input className="input" name={name} type={type} defaultValue={value ?? ""} required={required} step={type === "number" ? ".01" : undefined} /></label>; }

function FundForm({ fund, saving, onSubmit, onDelete }: { fund?: Fund; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete?: () => void }) {
  const methods: string[] = fund ? JSON.parse(fund.acceptedSubmissionMethods || "[]") : ["MANUAL"];
  const [method, setMethod] = useState(methods[0] || "MANUAL");
  return <form className="directory-admin-body directory-admin-form" onSubmit={onSubmit}><div className="directory-form-grid">
    <TextField name="name" label="Fund name" value={fund?.name} required /><TextField name="abbreviation" label="Short code" value={fund?.abbreviation} required /><TextField name="administrator" label="Administrator" value={fund?.administrator} /><TextField name="claimsEmail" label="Claims email" type="email" value={fund?.claimsEmail} /><TextField name="supportEmail" label="Provider support email" type="email" value={fund?.supportEmail} /><TextField name="phone" label="Contact number" value={fund?.phone} /><TextField name="portalUrl" label="Portal URL" type="url" value={fund?.portalUrl} /><TextField name="postalAddress" label="Postal address" value={fund?.postalAddress} /><TextField name="physicalAddress" label="Physical address" value={fund?.physicalAddress} /><TextField name="sortOrder" label="Sort order" type="number" value={fund?.sortOrder ?? 0} required />
    <label className="field"><span>Submission method</span><CustomSelect name="submissionMethod" value={method} onChange={setMethod} options={["MANUAL", "EMAIL", "PORTAL", "MEDISWITCH", "EDI", "OTHER"].map((value) => ({ value, label: value }))} /></label>
    <label className="field directory-wide"><span>Submission instructions</span><textarea className="input" name="submissionInstructions" defaultValue={fund?.submissionInstructions ?? ""} /></label>
    {[{ name: "coverSheetRequired", label: "Cover sheet required", checked: fund?.coverSheetRequired ?? false }, { name: "serviceDateRangeRequired", label: "Service-date range required", checked: fund?.serviceDateRangeRequired ?? false }, { name: "active", label: "Active", checked: fund?.active ?? true }, { name: "public", label: "Public booking option", checked: fund?.public ?? false }].map((item) => <label className="toggle-label" key={item.name}><input type="checkbox" name={item.name} defaultChecked={item.checked} /><span>{item.label}</span></label>)}
  </div><div className="manager-actions"><button className="btn btn-primary directory-save" disabled={saving}><Save size={16} />Save fund</button>{fund && onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}><Trash2 size={15} />Delete permanently</button>}</div></form>;
}

function ProcedureForm({ item, saving, onSubmit, onDelete }: { item?: Procedure; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete?: () => void }) {
  return <form className="directory-admin-body directory-admin-form" onSubmit={onSubmit}><div className="directory-form-grid"><TextField name="code" label="Code" value={item?.code} required /><TextField name="name" label="Name" value={item?.name} required /><TextField name="category" label="Category" value={item?.category} /><TextField name="defaultAmount" label="Default amount" type="number" value={item?.defaultAmount ?? 0} required /><label className="field directory-wide"><span>Description</span><textarea className="input" name="description" defaultValue={item?.description ?? ""} /></label>{[{ name: "requiresNappiCode", label: "Requires NAPPI code", checked: item?.requiresNappiCode ?? false }, { name: "requiresPreAuthorisation", label: "Requires pre-authorisation", checked: item?.requiresPreAuthorisation ?? false }, { name: "active", label: "Active", checked: item?.active ?? true }].map((value) => <label className="toggle-label" key={value.name}><input type="checkbox" name={value.name} defaultChecked={value.checked} /><span>{value.label}</span></label>)}</div><div className="manager-actions"><button className="btn btn-primary directory-save" disabled={saving}><Save size={16} />Save procedure</button>{item && onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}><Trash2 size={15} />Delete permanently</button>}</div></form>;
}
