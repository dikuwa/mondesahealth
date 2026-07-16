"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type Service = { id: string; name: string; description: string | null; public: boolean; sortOrder: number };
type Provider = { id: string; displayName: string; practiceName: string | null; biography: string | null; phone: string | null; email: string | null; operatingHours: string | null; public: boolean; sortOrder: number };
type Department = { id: string; slug: string; name: string; categoryLabel: string; summary: string; description: string; status: string; public: boolean; bookingEnabled: boolean; sortOrder: number; services: Service[]; providers: Provider[] };

function formObject(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}

export function DirectoryManager({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the directory", { id: toastId });
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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete item"); }
    finally { setSaving(false); }
  }

  function submitDepartment(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    patch({ ...data, entity: "DEPARTMENT", id, public: new FormData(form).has("public"), bookingEnabled: new FormData(form).has("bookingEnabled"), sortOrder: Number(data.sortOrder) }, "Saving department…", id ? undefined : form);
  }

  function submitChild(event: FormEvent<HTMLFormElement>, entity: "SERVICE" | "PROVIDER", departmentId: string, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    patch({ ...data, entity, departmentId, id, public: new FormData(form).has("public"), sortOrder: Number(data.sortOrder) }, `Saving ${entity.toLowerCase()}…`, id ? undefined : form);
  }

  return (
    <div className="directory-manager">
      <div className="directory-admin-intro">
        <p>Publish only confirmed information. Order values control how departments, services and providers appear publicly.</p>
        <span>{departments.length} departments</span>
      </div>

      {departments.map((department) => (
        <details className="card directory-admin-department" key={department.id}>
          <summary>
            <span><strong>{department.name}</strong><small>{department.status.replaceAll("_", " ")} · {department.public ? "Published" : "Hidden"}</small></span>
            <span>Order {department.sortOrder}</span>
          </summary>
          <div className="directory-admin-body">
            <div className="directory-delete-row"><span>Delete this department and its {department.services.length} services / {department.providers.length} providers.</span><button type="button" className="btn btn-danger" disabled={department.slug === "general-practice" || saving} onClick={() => setPendingDelete({ entity: "DEPARTMENT", id: department.id, label: department.name, detail: `${department.services.length} services and ${department.providers.length} providers will also be permanently deleted.` })}><Trash2 size={15} />Delete department</button></div>
            <form className="directory-admin-form" onSubmit={(event) => submitDepartment(event, department.id)}>
              <h2>Department details</h2>
              <div className="directory-form-grid">
                <Field name="name" label="Name" value={department.name} required />
                <Field name="slug" label="URL slug" value={department.slug} required />
                <Field name="categoryLabel" label="Category label" value={department.categoryLabel} required />
                <Field name="sortOrder" label="Order" type="number" value={department.sortOrder} required />
                <label className="field"><span>Status</span><select className="input" name="status" defaultValue={department.status}><option value="ACTIVE">Active</option><option value="COMING_SOON">Coming soon</option><option value="FUTURE">Future</option></select></label>
                <label className="toggle-label directory-toggle"><input name="public" type="checkbox" defaultChecked={department.public} /><span>Published publicly</span></label>
                <label className="field directory-wide"><span>Summary</span><textarea className="input" name="summary" defaultValue={department.summary} required /></label>
                <label className="field directory-wide"><span>Description</span><textarea className="input directory-description" name="description" defaultValue={department.description} required /></label>
                <label className="toggle-label directory-toggle directory-wide"><input name="bookingEnabled" type="checkbox" defaultChecked={department.bookingEnabled} disabled={department.slug !== "general-practice"} /><span>Online booking enabled (General Practice only)</span></label>
              </div>
              <SaveButton saving={saving} label="Save department" />
            </form>

            <section className="directory-admin-section">
              <h2>Services</h2>
              <div className="directory-admin-items">
                {department.services.map((service) => <ChildForm key={service.id} kind="SERVICE" item={service} saving={saving} onDelete={() => setPendingDelete({ entity: "SERVICE", id: service.id, label: service.name, detail: "This service will be permanently removed from the directory." })} onSubmit={(event) => submitChild(event, "SERVICE", department.id, service.id)} />)}
                <ChildForm kind="SERVICE" saving={saving} onSubmit={(event) => submitChild(event, "SERVICE", department.id)} />
              </div>
            </section>

            <section className="directory-admin-section">
              <h2>Providers</h2>
              {department.providers.length === 0 && <p className="muted">No provider profiles have been added. Keep profiles unpublished until all details are confirmed.</p>}
              <div className="directory-admin-items">
                {department.providers.map((provider) => <ChildForm key={provider.id} kind="PROVIDER" item={provider} saving={saving} onDelete={() => setPendingDelete({ entity: "PROVIDER", id: provider.id, label: provider.displayName, detail: "This provider profile will be permanently removed from the directory." })} onSubmit={(event) => submitChild(event, "PROVIDER", department.id, provider.id)} />)}
                <ChildForm kind="PROVIDER" saving={saving} onSubmit={(event) => submitChild(event, "PROVIDER", department.id)} />
              </div>
            </section>
          </div>
        </details>
      ))}

      <details className="card directory-admin-department directory-new">
        <summary><span><strong>Add a department</strong><small>Create it unpublished, then add confirmed content.</small></span><Plus size={18} /></summary>
        <form className="directory-admin-form directory-admin-body" onSubmit={(event) => submitDepartment(event)}>
          <div className="directory-form-grid">
            <Field name="name" label="Name" required /><Field name="slug" label="URL slug" required />
            <Field name="categoryLabel" label="Category label" required /><Field name="sortOrder" label="Order" type="number" value={departments.length + 1} required />
            <label className="field"><span>Status</span><select className="input" name="status" defaultValue="COMING_SOON"><option value="ACTIVE">Active</option><option value="COMING_SOON">Coming soon</option><option value="FUTURE">Future</option></select></label>
            <label className="toggle-label directory-toggle"><input name="public" type="checkbox" /><span>Published publicly</span></label>
            <label className="field directory-wide"><span>Summary</span><textarea className="input" name="summary" required /></label>
            <label className="field directory-wide"><span>Description</span><textarea className="input directory-description" name="description" required /></label>
          </div>
          <SaveButton saving={saving} label="Add department" />
        </form>
      </details>
      <ConfirmationDialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.label || "item"}?`} description={pendingDelete?.detail || "This action cannot be undone."} confirmLabel="Delete permanently" danger busy={saving} onCancel={() => setPendingDelete(null)} onConfirm={remove} />
    </div>
  );
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input className="input" name={name} type={type} defaultValue={value ?? ""} required={required} min={type === "number" ? 0 : undefined} /></label>;
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return <button className="btn btn-primary directory-save" disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={17} /> : <Save size={17} />}{label}</button>;
}

function ChildForm({ kind, item, saving, onSubmit, onDelete }: { kind: "SERVICE" | "PROVIDER"; item?: Service | Provider; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete?: () => void }) {
  const service = kind === "SERVICE" ? item as Service | undefined : undefined;
  const provider = kind === "PROVIDER" ? item as Provider | undefined : undefined;
  return <details className="directory-admin-item" open={!item}>
    <summary>{item ? (service?.name || provider?.displayName) : `Add ${kind.toLowerCase()}`}<small>{item && ((item.public ? "Published" : "Hidden") + ` · Order ${item.sortOrder}`)}</small></summary>
    <form className="directory-admin-child-form" onSubmit={onSubmit}>
      {kind === "SERVICE" ? <>
        <Field name="name" label="Service name" value={service?.name} required />
        <label className="field directory-wide"><span>Description (optional)</span><textarea className="input" name="description" defaultValue={service?.description ?? ""} /></label>
      </> : <>
        <Field name="displayName" label="Display name" value={provider?.displayName} required />
        <Field name="practiceName" label="Practice name (optional)" value={provider?.practiceName} />
        <Field name="phone" label="Phone (optional)" value={provider?.phone} />
        <Field name="email" label="Email (optional)" type="email" value={provider?.email} />
        <label className="field directory-wide"><span>Biography (optional)</span><textarea className="input" name="biography" defaultValue={provider?.biography ?? ""} /></label>
        <label className="field directory-wide"><span>Operating hours (optional)</span><textarea className="input" name="operatingHours" defaultValue={provider?.operatingHours ?? ""} /></label>
      </>}
      <Field name="sortOrder" label="Order" type="number" value={item?.sortOrder ?? 0} required />
      <label className="toggle-label directory-toggle"><input name="public" type="checkbox" defaultChecked={item?.public ?? false} /><span>Published publicly</span></label>
      <SaveButton saving={saving} label={item ? `Save ${kind.toLowerCase()}` : `Add ${kind.toLowerCase()}`} />
      {item && onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}><Trash2 size={15} />Delete permanently</button>}
    </form>
  </details>;
}
