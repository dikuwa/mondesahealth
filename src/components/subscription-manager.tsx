"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, Plus, Power } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { PlatformDialog } from "@/components/ui/platform-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type Plan = { id: string; name: string; description: string | null; billingFrequency: string; fee: number; gracePeriodDays: number; active: boolean };
export function SubscriptionManager({ plans, canManage }: { plans: Plan[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [frequency, setFrequency] = useState("MONTHLY");
  const [saving, setSaving] = useState(false);
  function close() { setOpen(false); setEditing(null); }
  function edit(plan: Plan) { setEditing(plan); setFrequency(plan.billingFrequency); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); const toastId = toast.loading(editing ? "Updating plan…" : "Creating plan…");
    try {
      const body = { ...(editing ? { id: editing.id, active: editing.active } : {}), name: form.get("name"), description: form.get("description"), billingFrequency: frequency, fee: Number(form.get("fee")), gracePeriodDays: Number(form.get("gracePeriodDays")) };
      const response = await fetch("/api/platform/subscriptions", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      toast.success(editing ? "Subscription plan updated" : "Subscription plan created", { id: toastId }); close(); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save plan", { id: toastId }); }
    finally { setSaving(false); }
  }
  async function toggle(plan: Plan) {
    setSaving(true); const toastId = toast.loading(plan.active ? "Archiving plan…" : "Activating plan…");
    try {
      const response = await fetch("/api/platform/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...plan, active: !plan.active }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      toast.success(plan.active ? "Plan archived" : "Plan activated", { id: toastId }); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update plan", { id: toastId }); }
    finally { setSaving(false); }
  }
  const current = editing;
  return <>
    <div className="manager-toolbar"><div><h2>Subscription plans</h2><p>Archiving is blocked while active subscriptions depend on a plan.</p></div>{canManage && <button className="btn btn-primary" onClick={() => { setFrequency("MONTHLY"); setOpen(true); }}><Plus size={16}/>Create plan</button>}</div>
    <div className="card dashboard-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Plan</th><th>Frequency</th><th>Fee</th><th>Grace period</th><th>Status</th><th>Actions</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><b>{plan.name}</b><small className="table-secondary">{plan.description || "No description"}</small></td><td>{plan.billingFrequency}</td><td>N${plan.fee.toFixed(2)}</td><td>{plan.gracePeriodDays} days</td><td><StatusBadge value={plan.active ? "ACTIVE" : "ARCHIVED"}/></td><td><div className="table-actions">{canManage && <><button className="btn btn-light" onClick={() => edit(plan)}><Edit3 size={15}/>Edit</button><button className="icon-action" title={plan.active ? "Archive plan" : "Activate plan"} disabled={saving} onClick={() => toggle(plan)}><Power size={16}/></button></>}</div></td></tr>)}</tbody></table></div>{!plans.length && <div className="dashboard-empty"><h3>No subscription plans</h3><p>Create a plan before assigning subscriptions to practices.</p></div>}</div>
    <PlatformDialog open={open || Boolean(editing)} eyebrow="Platform billing" title={editing ? `Edit ${editing.name}` : "Create subscription plan"} description="Plan changes affect future billing; existing clinical data is never removed." onClose={close} actions={<><button className="btn btn-light" onClick={close}>Cancel</button><button form="subscription-plan-form" className="btn btn-primary" disabled={saving}>{saving && <Loader2 className="toast-spinner" size={16}/>} {editing ? "Save plan" : "Create plan"}</button></>}>
      <form id="subscription-plan-form" className="form-grid" onSubmit={submit}><label className="field"><span>Name</span><input className="input" name="name" defaultValue={current?.name} required/></label><label className="field"><span>Billing frequency</span><CustomSelect value={frequency} onChange={setFrequency} options={["MONTHLY","QUARTERLY","ANNUAL","FIXED"].map((value) => ({ value, label: value }))}/></label><label className="field"><span>Fee (NAD)</span><input className="input" name="fee" type="number" min="0" step="0.01" defaultValue={current?.fee} required/></label><label className="field"><span>Grace period days</span><input className="input" name="gracePeriodDays" type="number" min="0" max="90" defaultValue={current?.gracePeriodDays ?? 7} required/></label><label className="field field-span-2"><span>Description</span><textarea className="input" name="description" defaultValue={current?.description || ""}/></label></form>
    </PlatformDialog>
  </>;
}
