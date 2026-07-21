"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, Crown, KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { PlatformDialog } from "@/components/ui/platform-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PLATFORM_PERMISSIONS,
  platformPermissionLabels,
  platformRoleDefaults,
  platformRoleLabels,
  type PlatformPermission,
  type PlatformRole,
} from "@/lib/platform-permissions";

type Member = { id: string; userId: string; name: string; email: string; role: PlatformRole; permissions: PlatformPermission[]; active: boolean; isPrimary: boolean; createdAt: string };
const assignableRoles: PlatformRole[] = ["PLATFORM_ADMIN", "OPERATIONS", "FINANCE", "COMPLIANCE", "SUPPORT"];

export function PlatformUsersManager({ members, canTransfer }: { members: Member[]; canTransfer: boolean }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [remove, setRemove] = useState<Member | null>(null);
  const [transfer, setTransfer] = useState<Member | null>(null);
  const [role, setRole] = useState<PlatformRole>("OPERATIONS");
  const [permissions, setPermissions] = useState<PlatformPermission[]>(platformRoleDefaults.OPERATIONS);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const close = () => { setInviteOpen(false); setEditing(null); setRemove(null); setTransfer(null); };
  function chooseRole(value: string) { const next = value as PlatformRole; setRole(next); setPermissions(platformRoleDefaults[next]); }
  function beginEdit(member: Member) { setEditing(member); setRole(member.role); setPermissions(member.permissions); }
  async function send(method: "POST" | "PUT" | "PATCH" | "DELETE", body: object, message: string) {
    setBusy(true); const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/platform/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (data.inviteUrl) setInviteUrl(`${location.origin}${data.inviteUrl}`);
      toast.success(data.passwordReset ? "Password-reset invitation created" : data.inviteUrl ? "Platform invitation created" : "Platform access updated", { id: toastId });
      close(); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update platform access", { id: toastId }); }
    finally { setBusy(false); }
  }
  async function transferOwnership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!transfer) return;
    setBusy(true); const toastId = toast.loading("Transferring primary ownership…"); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/platform/users/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetMembershipId: transfer.id, password: form.get("password"), confirmation: form.get("confirmation") }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      toast.success("Primary ownership transferred. Sign in again.", { id: toastId }); window.location.assign("/login");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not transfer ownership", { id: toastId }); setBusy(false); }
  }
  const permissionGrid = <fieldset className="permission-grid platform-permission-grid"><legend>Platform permissions</legend>{PLATFORM_PERMISSIONS.filter((permission) => permission !== "TRANSFER_PLATFORM_OWNERSHIP").map((permission) => <label key={permission}><input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))}/><span>{platformPermissionLabels[permission]}</span></label>)}</fieldset>;
  return <>
    {inviteUrl && <div className="password-copy-banner" role="status"><ShieldCheck size={20}/><div><b>Platform invitation ready</b><code>{inviteUrl}</code><small>Send this seven-day link through an approved private channel.</small></div><button className="btn btn-light" onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Invitation copied"))}><Clipboard size={16}/>Copy</button></div>}
    <div className="manager-toolbar"><div><h2>Platform team</h2><p>Platform roles never grant routine access to practice clinical records.</p></div><button className="btn btn-primary" onClick={() => { chooseRole("OPERATIONS"); setInviteOpen(true); }}><Plus size={16}/>Invite team member</button></div>
    <div className="card dashboard-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Team member</th><th>Role</th><th>Permissions</th><th>Status</th><th>Actions</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><b>{member.name}</b><small className="table-secondary">{member.email}</small></td><td>{member.isPrimary && <Crown size={15}/>} {platformRoleLabels[member.role]}</td><td>{member.permissions.length} enabled</td><td><StatusBadge value={member.active ? "ENABLED" : "DISABLED"}/></td><td><div className="table-actions">{!member.isPrimary && <><button className="btn btn-light" onClick={() => beginEdit(member)}>Edit</button><button className="icon-action" title={member.active ? "Disable" : "Enable"} onClick={() => send("PATCH", { id: member.id, active: !member.active }, member.active ? "Disabling access…" : "Enabling access…")}>{member.active ? <UserRoundX size={16}/> : <UserRoundCheck size={16}/>}</button>{member.active && <button className="icon-action" title="Create password-reset invitation" onClick={() => send("PUT", { id: member.id }, "Creating password-reset invitation…")}><KeyRound size={16}/></button>}{canTransfer && member.active && <button className="icon-action" title="Transfer ownership" onClick={() => setTransfer(member)}><Crown size={16}/></button>}<button className="icon-action is-danger" title="Remove platform access" onClick={() => setRemove(member)}><Trash2 size={16}/></button></>}</div></td></tr>)}</tbody></table></div></div>
    <PlatformDialog open={inviteOpen} eyebrow="Platform administration" title="Invite platform team member" description="A secure activation link is created for manual delivery." onClose={close} wide actions={<><button className="btn btn-light" onClick={close}>Cancel</button><button form="platform-invite-form" className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="toast-spinner" size={16}/>}Create invitation</button></>}><form id="platform-invite-form" className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); send("POST", { name: form.get("name"), email: form.get("email"), role, permissions }, "Creating platform invitation…"); }}><label className="field"><span>Name</span><input className="input" name="name" required/></label><label className="field"><span>Email</span><input className="input" name="email" type="email" required/></label><label className="field field-span-2"><span>Role</span><CustomSelect value={role} onChange={chooseRole} options={assignableRoles.map((value) => ({ value, label: platformRoleLabels[value] }))}/></label><div className="field-span-2">{permissionGrid}</div></form></PlatformDialog>
    <PlatformDialog open={Boolean(editing)} eyebrow="Access management" title={editing ? `Edit ${editing.name}` : "Edit access"} onClose={close} wide actions={<><button className="btn btn-light" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => editing && send("PATCH", { id: editing.id, role, permissions }, "Updating platform access…")}>Save access</button></>}><div className="form-grid"><label className="field field-span-2"><span>Role</span><CustomSelect value={role} onChange={chooseRole} options={assignableRoles.map((value) => ({ value, label: platformRoleLabels[value] }))}/></label><div className="field-span-2">{permissionGrid}</div></div></PlatformDialog>
    <PlatformDialog open={Boolean(remove)} eyebrow="Protected action" title="Remove platform access?" description={remove ? `${remove.name} will no longer be able to enter Platform Administration. Practice memberships remain independent.` : undefined} onClose={close} actions={<><button className="btn btn-light" onClick={close}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={() => remove && send("DELETE", { id: remove.id, confirmation: "REMOVE PLATFORM ACCESS" }, "Removing platform access…")}>Remove access</button></> }><p className="notice-warning">Audit-linked accounts are retained and disabled instead of deleting historical attribution.</p></PlatformDialog>
    <PlatformDialog open={Boolean(transfer)} eyebrow="Primary ownership" title={transfer ? `Transfer ownership to ${transfer.name}?` : "Transfer ownership"} description="Your platform session will be invalidated immediately." onClose={close} actions={<><button className="btn btn-light" onClick={close}>Cancel</button><button form="platform-transfer-form" className="btn btn-danger" disabled={busy}>Transfer ownership</button></>}><form id="platform-transfer-form" className="form-grid" onSubmit={transferOwnership}><label className="field field-span-2"><span>Your current password</span><input className="input" name="password" type="password" autoComplete="current-password" required/></label><label className="field field-span-2"><span>Type TRANSFER PLATFORM OWNERSHIP</span><input className="input" name="confirmation" required/></label></form></PlatformDialog>
  </>;
}
