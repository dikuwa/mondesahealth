"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { validEmergencyPhone } from "@/lib/emergency";

export type EmergencyContactRow = {
  id: string;
  label: string;
  phone: string;
  description: string | null;
  region: string | null;
  sortOrder: number;
  active: boolean;
  primary: boolean;
};

const blank = { label: "", phone: "", description: "", region: "", sortOrder: 0, active: true, primary: false };

export function EmergencyAiSettings({ initialContacts, initialAiEnabled, initialImageEnabled }: { initialContacts: EmergencyContactRow[]; initialAiEnabled: boolean; initialImageEnabled: boolean }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [editing, setEditing] = useState<EmergencyContactRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EmergencyContactRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [imageEnabled, setImageEnabled] = useState(initialImageEnabled);

  async function refresh() {
    const response = await fetch("/api/emergency-contacts");
    const data = await response.json();
    if (response.ok) setContacts(data.contacts);
  }

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "");
    if (!validEmergencyPhone(phone)) return toast.error("Enter a valid Namibian telephone number.");
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      label: String(form.get("label") || ""),
      phone,
      description: String(form.get("description") || "") || null,
      region: String(form.get("region") || "") || null,
      sortOrder: Number(form.get("sortOrder") || 0),
      active: form.get("active") === "on",
      primary: form.get("primary") === "on",
    };
    setSaving(true);
    const toastId = toast.loading("Saving emergency contact…");
    try {
      const response = await fetch("/api/emergency-contacts", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
      setEditing(null);
      setAdding(false);
      toast.success("Emergency contact saved", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save emergency contact", { id: toastId });
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!pendingDelete || saving) return;
    setSaving(true);
    const toastId = toast.loading("Deleting emergency contact…");
    try {
      const response = await fetch("/api/emergency-contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pendingDelete.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
      setPendingDelete(null);
      toast.success("Emergency contact deleted", { id: toastId });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete emergency contact", { id: toastId }); }
    finally { setSaving(false); }
  }

  async function move(contact: EmergencyContactRow, direction: -1 | 1) {
    const ordered = [...contacts].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === contact.id);
    const other = ordered[index + direction];
    if (!other || saving) return;
    setSaving(true);
    try {
      for (const [row, sortOrder] of [[contact, other.sortOrder], [other, contact.sortOrder]] as const) {
        const response = await fetch("/api/emergency-contacts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, sortOrder }) });
        if (!response.ok) throw new Error((await response.json()).error);
      }
      await refresh();
      toast.success("Emergency contact order saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not reorder contacts"); }
    finally { setSaving(false); }
  }

  async function saveAiSettings() {
    if (saving) return;
    setSaving(true);
    const toastId = toast.loading("Saving AI intake settings…");
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiIntakeEnabled: aiEnabled, aiImageEnabled: imageEnabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("AI intake settings saved", { id: toastId });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save AI settings", { id: toastId }); }
    finally { setSaving(false); }
  }

  const formValue = editing ?? { ...blank, sortOrder: contacts.length };
  return <>
    <div className="settings-card-heading"><h2>Emergency contacts and AI intake</h2><p className="muted">Owner-managed emergency information and optional AI-assisted symptom intake. Telephone numbers appear publicly only while active.</p></div>
    <div className="settings-section-grid">
      <section>
        <div className="emergency-section-heading"><div><h3>Emergency contacts</h3><p className="muted">The active primary contact is shown first.</p></div><button className="btn btn-light" type="button" disabled={saving} onClick={() => { setEditing(null); setAdding(true); }}><Plus size={16}/> Add contact</button></div>
        <div className="emergency-contact-list">
          {contacts.map((contact, index) => <article className="emergency-contact-card" key={contact.id}>
            <div><b>{contact.label}</b><a href={`tel:${contact.phone}`}>{contact.phone}</a><small>{contact.region || contact.description || "No additional description"}</small></div>
            <div className="status-cluster"><span className={`status-badge ${contact.active ? "is-active" : ""}`}>{contact.active ? "Active" : "Inactive"}</span>{contact.primary && <span className="status-badge is-active">Primary</span>}</div>
            <div className="table-actions"><button className="icon-action" type="button" aria-label={`Move ${contact.label} up`} disabled={saving || index === 0} onClick={() => move(contact, -1)}><ArrowUp size={16}/></button><button className="icon-action" type="button" aria-label={`Move ${contact.label} down`} disabled={saving || index === contacts.length - 1} onClick={() => move(contact, 1)}><ArrowDown size={16}/></button><button className="icon-action" type="button" aria-label={`Edit ${contact.label}`} onClick={() => { setEditing(contact); setAdding(false); }}><Pencil size={16}/></button><button className="icon-action" type="button" aria-label={`Delete ${contact.label}`} onClick={() => setPendingDelete(contact)}><Trash2 size={16}/></button></div>
          </article>)}
          {!contacts.length && <p className="dashboard-empty">No emergency contacts configured. Public pages use neutral emergency guidance without inventing a number.</p>}
        </div>
        {(adding || editing) && <form className="emergency-contact-form" onSubmit={saveContact}>
          <div className="emergency-form-heading"><h3>{editing ? "Edit emergency contact" : "Add emergency contact"}</h3><button className="icon-action" type="button" aria-label="Close emergency contact form" onClick={() => { setAdding(false); setEditing(null); }}><X size={17}/></button></div>
          <label className="field"><span>Contact label *</span><input className="input" name="label" defaultValue={formValue.label} required maxLength={80}/></label>
          <label className="field"><span>Telephone number *</span><input className="input" name="phone" defaultValue={formValue.phone} required inputMode="tel" placeholder="081 123 4567"/></label>
          <label className="field"><span>Description (optional)</span><input className="input" name="description" defaultValue={formValue.description || ""} maxLength={240}/></label>
          <label className="field"><span>Region or location (optional)</span><input className="input" name="region" defaultValue={formValue.region || ""} maxLength={120}/></label>
          <label className="field"><span>Display priority</span><input className="input" type="number" name="sortOrder" min={0} max={999} defaultValue={formValue.sortOrder}/></label>
          <div className="emergency-contact-actions">
            <label className="toggle-label"><input name="active" type="checkbox" defaultChecked={formValue.active}/><span>Active</span></label>
            <label className="toggle-label"><input name="primary" type="checkbox" defaultChecked={formValue.primary}/><span>Primary emergency contact</span></label>
            <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={17}/> : <Save size={17}/>} Save contact</button>
          </div>
        </form>}
      </section>
      <section className="emergency-ai-section"><h3>AI-assisted patient intake</h3><p className="muted">AI assistance is optional. If the configured server-side provider is unavailable, patients can continue booking manually.</p>
        <label className="toggle-label settings-checkbox-row"><input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)}/><span>Enable AI-assisted symptom intake globally</span></label>
        <label className="toggle-label settings-checkbox-row"><input type="checkbox" checked={imageEnabled} onChange={(event) => setImageEnabled(event.target.checked)}/><span>Allow optional symptom photos</span></label>
        <p className="notice-warning">AI output organises patient-reported information only. It cannot diagnose, prescribe, or replace clinician review.</p>
        <button className="btn btn-primary" type="button" disabled={saving} onClick={saveAiSettings}>{saving ? <Loader2 className="toast-spinner" size={17}/> : <Save size={17}/>} Save AI settings</button>
      </section>
    </div>
    <ConfirmationDialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.label || "contact"}?`} description="This emergency contact will be permanently removed from public emergency guidance." confirmLabel="Delete contact" danger busy={saving} onCancel={() => setPendingDelete(null)} onConfirm={remove}/>
  </>;
}
