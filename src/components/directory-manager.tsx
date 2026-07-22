"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";

type Service = { id: string; name: string; description: string | null; public: boolean; sortOrder: number; aiIntakeEnabled: boolean | null; durationMinutes: number; active: boolean };
type Provider = { id: string; displayName: string; practiceName: string | null; biography: string | null; phone: string | null; email: string | null; operatingHours: string | null; public: boolean; sortOrder: number; aiIntakeEnabled: boolean | null };
type Department = { id: string; slug: string; name: string; categoryLabel: string; summary: string; description: string; status: string; public: boolean; bookingEnabled: boolean; sortOrder: number; services: Service[]; providers: Provider[] };

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMING_SOON", label: "Coming soon" },
  { value: "FUTURE", label: "Future" },
];

function formObject(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}

export function DirectoryManager({ departments, canManageCategories = false, categoriesOnly = false }: { departments: Department[]; canManageCategories?: boolean; categoriesOnly?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Record<string, number>>(() => Object.fromEntries(departments.map((department) => [department.id, department.sortOrder])));
  const [editing, setEditing] = useState<Department | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ entity: "DEPARTMENT" | "SERVICE" | "PROVIDER"; id: string; label: string; detail: string } | null>(null);

  async function patch(body: object, message: string, form?: HTMLFormElement) {
    setSaving(true);
    const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/directory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Directory saved", { id: toastId });
      form?.reset();
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the directory", { id: toastId });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      const response = await fetch("/api/directory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: pendingDelete.entity, id: pendingDelete.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(`${pendingDelete.label} deleted`);
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item");
    } finally {
      setSaving(false);
    }
  }

  async function submitDepartment(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const saved = await patch({ ...data, entity: "DEPARTMENT", id, public: new FormData(form).has("public"), bookingEnabled: new FormData(form).has("bookingEnabled"), sortOrder: Number(data.sortOrder) }, id ? `Saving ${data.name || "department"}…` : "Adding department…", id ? undefined : form);
    if (!saved) return;
    if (id) setEditing(null);
    else setAdding(false);
  }

  function submitChild(event: FormEvent<HTMLFormElement>, entity: "SERVICE" | "PROVIDER", departmentId: string, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    patch({ ...data, entity, departmentId, id, public: new FormData(form).has("public"), active: entity === "SERVICE" ? new FormData(form).has("active") : undefined, durationMinutes: entity === "SERVICE" ? Number(data.durationMinutes) : undefined, aiIntakeEnabled: data.aiIntakeMode === "INHERIT" ? null : data.aiIntakeMode === "ENABLED", sortOrder: Number(data.sortOrder) }, `Saving ${entity.toLowerCase()}…`, id ? undefined : form);
  }

  async function saveOrder() {
    setSaving(true);
    const id = toast.loading("Saving department order…");
    try {
      for (const department of departments) {
        const sortOrder = orders[department.id] ?? department.sortOrder;
        if (sortOrder === department.sortOrder) continue;
        const response = await fetch("/api/directory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: "DEPARTMENT",
            id: department.id,
            name: department.name,
            slug: department.slug,
            categoryLabel: department.categoryLabel,
            summary: department.summary,
            description: department.description,
            status: department.status,
            public: department.public,
            bookingEnabled: department.bookingEnabled,
            sortOrder,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      }
      toast.success("Department order saved", { id });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save order", { id });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="directory-manager approved-directory">
      <div className="directory-admin-intro">
        <p>Publish only confirmed information. Use the numbered order field to control how items appear publicly.</p>
        <div className="manager-actions">
          <b>{departments.length} departments</b>
          {canManageCategories && <button className="btn btn-primary" type="button" onClick={() => setAdding(true)}><Plus size={17} /> Add department</button>}
        </div>
      </div>

      <section className="card dashboard-card directory-table-panel">
        <div className="directory-table-actions">
          {canManageCategories && <button className="btn btn-light" type="button" disabled={saving} onClick={saveOrder}>
            {saving ? <Loader2 className="toast-spinner" size={15} /> : <Save size={15} />}
            {saving ? "Saving order…" : "Save order"}
          </button>}
        </div>
        <div className="table-scroll">
          <table className="data-table directory-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Public status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td><b>{department.name}</b></td>
                  <td>
                    <div className="status-cluster">
                      <StatusBadge value={department.status} />
                      <StatusBadge value={department.public ? "PUBLISHED" : "HIDDEN"} />
                    </div>
                  </td>
                  <td>
                    <input
                      className="input directory-order-input"
                      aria-label={`Order for ${department.name}`}
                      type="number"
                      min={0}
                      value={orders[department.id] ?? department.sortOrder}
                      onChange={(event) => setOrders((current) => ({ ...current, [department.id]: Number(event.target.value) }))}
                    />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-light" type="button" onClick={() => setEditing(department)}>Manage</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="directory-order-note">Use the order field and Save order to update the public directory sequence.</p>
      </section>

      {!!departments.length && (
        <div className="record-card-list directory-mobile-cards">
          {departments.map((department) => (
            <article className="record-card" key={department.id}>
              <span className="record-card-heading"><b>{department.name}</b><small>Order {orders[department.id] ?? department.sortOrder}</small></span>
              <span className="status-cluster">
                <StatusBadge value={department.status} />
                <StatusBadge value={department.public ? "PUBLISHED" : "HIDDEN"} />
              </span>
              <span className="record-card-actions"><button className="btn btn-light" onClick={() => setEditing(department)}>Manage</button></span>
            </article>
          ))}
        </div>
      )}

      {(editing || adding) && (
        <DirectoryModalEditor
          title={editing ? `Manage ${editing.name}` : "Add department"}
          description={editing ? "Update public directory details, services and providers. Progress is confirmed as each save completes." : "Create a new public directory department without scrolling away from the list."}
          onClose={() => { setEditing(null); setAdding(false); }}
        >
          {canManageCategories && <DepartmentForm department={editing ?? undefined} departments={departments} saving={saving} onSubmit={(event) => submitDepartment(event, editing?.id)} onDelete={editing ? () => setPendingDelete({ entity: "DEPARTMENT", id: editing.id, label: editing.name, detail: `${editing.services.length} services and ${editing.providers.length} providers will also be permanently deleted.` }) : undefined} />}
          {editing && !categoriesOnly && (
            <div className="directory-child-sections">
              <section className="directory-admin-section">
                <h2>Services</h2>
                <div className="directory-admin-items">
                  {editing.services.map((service) => <ChildForm key={service.id} kind="SERVICE" item={service} saving={saving} onDelete={() => setPendingDelete({ entity: "SERVICE", id: service.id, label: service.name, detail: "This service will be permanently removed from the directory." })} onSubmit={(event) => submitChild(event, "SERVICE", editing.id, service.id)} />)}
                  <ChildForm kind="SERVICE" saving={saving} onSubmit={(event) => submitChild(event, "SERVICE", editing.id)} />
                </div>
              </section>
              <section className="directory-admin-section">
                <h2>Providers</h2>
                {editing.providers.length === 0 && <p className="muted">No provider profiles have been added. Keep profiles unpublished until all details are confirmed.</p>}
                <div className="directory-admin-items">
                  {editing.providers.map((provider) => <ChildForm key={provider.id} kind="PROVIDER" item={provider} saving={saving} onDelete={() => setPendingDelete({ entity: "PROVIDER", id: provider.id, label: provider.displayName, detail: "This provider profile will be permanently removed from the directory." })} onSubmit={(event) => submitChild(event, "PROVIDER", editing.id, provider.id)} />)}
                  <ChildForm kind="PROVIDER" saving={saving} onSubmit={(event) => submitChild(event, "PROVIDER", editing.id)} />
                </div>
              </section>
            </div>
          )}
        </DirectoryModalEditor>
      )}

      <ConfirmationDialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.label || "item"}?`} description={pendingDelete?.detail || "This action cannot be undone."} confirmLabel="Delete permanently" danger busy={saving} onCancel={() => setPendingDelete(null)} onConfirm={remove} />
    </div>
  );
}

function DirectoryModalEditor({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="directory-editor-title">
      <button className="appointment-modal-backdrop" aria-label="Close directory editor" onClick={onClose} />
      <div className="appointment-panel modal-editor-panel directory-editor-panel">
        <div className="appointment-panel-heading modal-editor-heading">
          <div>
            <span className="eyebrow">Public directory</span>
            <h2 id="directory-editor-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" aria-label="Close directory editor" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-editor-body">{children}</div>
      </div>
    </div>
  );
}

function DepartmentForm({ department, departments, saving, onSubmit, onDelete }: { department?: Department; departments: Department[]; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete?: () => void }) {
  return (
    <form className="directory-admin-form" onSubmit={onSubmit}>
      {department && onDelete && <div className="directory-delete-row"><span>Delete this department and its {department.services.length} services / {department.providers.length} providers.</span><button type="button" className="btn btn-danger" disabled={department.slug === "general-practice" || saving} onClick={onDelete}><Trash2 size={15} />Delete department</button></div>}
      <div className="directory-form-grid">
        <Field name="name" label="Name" value={department?.name} required />
        <Field name="slug" label="URL slug" value={department?.slug} required />
        <Field name="categoryLabel" label="Category label" value={department?.categoryLabel} required />
        <Field name="sortOrder" label="Order" type="number" value={department?.sortOrder ?? departments.length} required />
        <DirectoryStatusSelect value={department?.status ?? "COMING_SOON"} />
        <label className="toggle-label directory-toggle"><input name="public" type="checkbox" defaultChecked={department?.public ?? false} /><span>Published publicly</span></label>
        <label className="field directory-wide"><span>Summary</span><textarea className="input" name="summary" defaultValue={department?.summary ?? ""} required /></label>
        <label className="field directory-wide"><span>Description</span><textarea className="input directory-description" name="description" defaultValue={department?.description ?? ""} required /></label>
        <label className="toggle-label directory-toggle directory-wide"><input name="bookingEnabled" type="checkbox" defaultChecked={department?.bookingEnabled ?? false} /><span>Online booking enabled</span></label>
      </div>
      <SaveButton saving={saving} label={department ? "Save department" : "Add department"} />
    </form>
  );
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input className="input" name={name} type={type} defaultValue={value ?? ""} required={required} min={type === "number" ? 0 : undefined} /></label>;
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return <button className="btn btn-primary directory-save" disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={17} /> : <Save size={17} />}{saving ? "Saving…" : label}</button>;
}

function DirectoryStatusSelect({ value }: { value: string }) {
  const [status, setStatus] = useState(value);
  return <label className="field"><span>Status</span><CustomSelect name="status" value={status} onChange={setStatus} options={statusOptions} /></label>;
}

function ChildForm({ kind, item, saving, onSubmit, onDelete }: { kind: "SERVICE" | "PROVIDER"; item?: Service | Provider; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete?: () => void }) {
  const service = kind === "SERVICE" ? item as Service | undefined : undefined;
  const provider = kind === "PROVIDER" ? item as Provider | undefined : undefined;
  return <details className="directory-admin-item" open={!item}>
    <summary>{item ? (service?.name || provider?.displayName) : `Add ${kind.toLowerCase()}`}<small>{item && ((item.public ? "Published" : "Hidden") + ` · Order ${item.sortOrder}`)}</small></summary>
    <form className="directory-admin-child-form" onSubmit={onSubmit}>
      {kind === "SERVICE" ? <>
        <Field name="name" label="Service name" value={service?.name} required />
        <Field name="durationMinutes" label="Appointment duration (minutes)" type="number" value={service?.durationMinutes ?? 30} required />
        <label className="field directory-wide"><span>Description (optional)</span><textarea className="input" name="description" defaultValue={service?.description ?? ""} /></label>
        <label className="toggle-label directory-toggle"><input name="active" type="checkbox" defaultChecked={service?.active ?? true} /><span>Available for booking</span></label>
      </> : <>
        <Field name="displayName" label="Display name" value={provider?.displayName} required />
        <Field name="practiceName" label="Practice name (optional)" value={provider?.practiceName} />
        <Field name="phone" label="Phone (optional)" value={provider?.phone} />
        <Field name="email" label="Email (optional)" type="email" value={provider?.email} />
        <label className="field directory-wide"><span>Biography (optional)</span><textarea className="input" name="biography" defaultValue={provider?.biography ?? ""} /></label>
        <label className="field directory-wide"><span>Operating hours (optional)</span><textarea className="input" name="operatingHours" defaultValue={provider?.operatingHours ?? ""} /></label>
      </>}
      <Field name="sortOrder" label="Order" type="number" value={item?.sortOrder ?? 0} required />
      <AiIntakeSelect value={item?.aiIntakeEnabled} kind={kind.toLowerCase()} />
      <label className="toggle-label directory-toggle"><input name="public" type="checkbox" defaultChecked={item?.public ?? false} /><span>Published publicly</span></label>
      <SaveButton saving={saving} label={item ? `Save ${kind.toLowerCase()}` : `Add ${kind.toLowerCase()}`} />
      {item && onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}><Trash2 size={15} />Delete permanently</button>}
    </form>
  </details>;
}

function AiIntakeSelect({ value, kind }: { value: boolean | null | undefined; kind: string }) {
  const [mode, setMode] = useState(value == null ? "INHERIT" : value ? "ENABLED" : "DISABLED");
  return <label className="field"><span>AI-assisted intake</span><CustomSelect name="aiIntakeMode" value={mode} onChange={setMode} options={[{ value: "INHERIT", label: "Use global setting" }, { value: "ENABLED", label: "Allow when globally enabled" }, { value: "DISABLED", label: `Disable for this ${kind}` }]}/></label>;
}
