"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PERMISSIONS,
  permissionLabels,
  ROLES,
  roleDefaults,
  type Permission,
  type StaffRole,
} from "@/lib/permissions";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
  active: boolean;
  mustChangePassword: boolean;
  avatarData: string | null;
  platformAccount?: boolean;
};

const roleOptions = ROLES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));
const password = () => `Mh!${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}9`;

export function StaffManager({
  initial,
  currentId,
  currentRole,
}: {
  initial: Staff[];
  currentId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<StaffRole>("RECEPTIONIST");
  const [permissions, setPermissions] = useState<Permission[]>(roleDefaults.RECEPTIONIST);
  const [temp, setTemp] = useState(password());
  const [issuedPassword, setIssuedPassword] = useState<{ user: string; password: string } | null>(null);
  const [issuedInvite, setIssuedInvite] = useState<{ user: string; url: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);
  const availableRoles = currentRole === "OWNER" ? roleOptions : roleOptions.filter((option) => option.value !== "OWNER");

  async function request(body: object, message: string) {
    setSaving(true);
    const toastId = toast.loading(message);
    try {
      const response = await fetch("/api/users", {
        method: body && "id" in body ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.password) setIssuedPassword({ user: data.name || "Staff member", password: data.password });
      if (data.inviteUrl) setIssuedInvite({ user: data.name || "Staff member", url: `${location.origin}${data.inviteUrl}` });
      toast.success("Staff access updated", { id: toastId });
      setOpen(false);
      setEditing(null);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update staff", { id: toastId });
      return false;
    } finally {
      setSaving(false);
    }
  }

  function changeRole(next: string) {
    const value = next as StaffRole;
    setRole(value);
    setPermissions(roleDefaults[value]);
  }

  function editUser(user: Staff) {
    setEditing(user);
    setRole(user.role as StaffRole);
    setPermissions(user.permissions);
  }

  async function resetPassword(user: Staff) {
    const next = password();
    const ok = await request({ id: user.id, password: next }, "Resetting password…");
    if (ok) {
      setIssuedPassword({ user: user.name, password: next });
    }
  }

  async function copyIssuedPassword() {
    if (!issuedPassword) return;
    await navigator.clipboard?.writeText(issuedPassword.password);
    toast.success("Temporary password copied");
  }

  async function deleteUser() {
    if (!pendingDelete) return;
    setSaving(true);
    const toastId = toast.loading("Deleting staff account…");
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id, confirmation: "DELETE STAFF USER" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Staff account deleted", { id: toastId });
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete staff account", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {issuedPassword && (
        <div className="password-copy-banner" role="status">
          <CheckCircle2 size={22} />
          <div>
            <b>Temporary password ready</b>
            <code>{issuedPassword.password}</code>
            <small>Give this to {issuedPassword.user}. They can change it from Profile after login.</small>
          </div>
          <button className="btn btn-light" type="button" onClick={copyIssuedPassword}><Clipboard size={16} /> Copy</button>
          <button className="icon-action" type="button" aria-label="Dismiss password" onClick={() => setIssuedPassword(null)}><X size={16} /></button>
        </div>
      )}
      {issuedInvite && <div className="password-copy-banner" role="status"><ShieldCheck size={22}/><div><b>Existing account invitation ready</b><code>{issuedInvite.url}</code><small>{issuedInvite.user} must sign in with their existing password to accept this practice membership.</small></div><button className="btn btn-light" type="button" onClick={() => navigator.clipboard.writeText(issuedInvite.url).then(() => toast.success("Invitation copied"))}><Clipboard size={16}/>Copy</button><button className="icon-action" type="button" aria-label="Dismiss invitation" onClick={() => setIssuedInvite(null)}><X size={16}/></button></div>}
      <div className="card dashboard-card" style={{ padding: 20 }}>
        <div className="manager-toolbar">
          <div>
            <h2>Staff accounts</h2>
            <p>Accounts can sign in immediately. Login email stays fixed; profile names and avatars are separate.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setRole("RECEPTIONIST");
              setPermissions(roleDefaults.RECEPTIONIST);
              setTemp(password());
              setOpen(true);
            }}
          >
            <Plus size={17} /> Add staff member
          </button>
        </div>
        <div className="table-scroll staff-table-wrap">
          <table className="data-table staff-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="staff-cell">
                      <StaffAvatar user={user} />
                      <div>
                        <b>{user.name}</b>
                        <small>{user.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>{user.permissions.length} enabled</td>
                  <td>
                    <StatusBadge value={user.active ? "ENABLED" : "DISABLED"} />
                    {user.mustChangePassword && <small style={{ display: "block", marginTop: 5 }}>Password change due</small>}
                  </td>
                  <td>
                    <StaffActions
                      user={user}
                      currentId={currentId}
                      saving={saving}
                      onEdit={() => editUser(user)}
                      onToggle={() => request({ id: user.id, active: !user.active }, user.active ? "Disabling account…" : "Enabling account…")}
                      onReset={() => resetPassword(user)}
                      onDelete={() => setPendingDelete(user)}
                      canDelete={currentRole === "OWNER"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="record-card-list staff-card-list">
          {initial.map((user) => (
            <article className="record-card" key={user.id}>
              <span className="record-card-heading">
                <span className="staff-cell">
                  <StaffAvatar user={user} />
                  <div>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </div>
                </span>
                <StatusBadge value={user.active ? "ENABLED" : "DISABLED"} />
              </span>
              <small>{user.role} · {user.permissions.length} permissions{user.mustChangePassword ? " · Password change due" : ""}</small>
              <span className="record-card-actions">
                <StaffActions
                  user={user}
                  currentId={currentId}
                  saving={saving}
                  onEdit={() => editUser(user)}
                  onToggle={() => request({ id: user.id, active: !user.active }, user.active ? "Disabling account…" : "Enabling account…")}
                  onReset={() => resetPassword(user)}
                  onDelete={() => setPendingDelete(user)}
                  canDelete={currentRole === "OWNER"}
                />
              </span>
            </article>
          ))}
        </div>
      </div>
      {(open || editing) && (
        <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="staff-title">
          <button className="appointment-modal-backdrop" aria-label="Close staff form" onClick={() => { setOpen(false); setEditing(null); }} />
          <form
            className="appointment-panel"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              request(editing ? { id: editing.id, role, permissions } : { name: form.get("name"), email: form.get("email"), password: temp, role, permissions }, editing ? "Updating access…" : "Creating staff account…");
            }}
          >
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Access management</span>
                <h2 id="staff-title">{editing ? `Access for ${editing.name}` : "New staff account"}</h2>
                <p>{editing ? "Role defaults can be customised for this team member." : "The account can sign in immediately with the temporary password."}</p>
              </div>
              <button type="button" aria-label="Close staff form" onClick={() => { setOpen(false); setEditing(null); }}><X size={20} /></button>
            </div>
            <div className="appointment-form-grid">
              {!editing && (
                <>
                  <div className="field"><label>Display name</label><input className="input" name="name" required /></div>
                  <div className="field"><label>Login email</label><input className="input" name="email" type="email" required /></div>
                </>
              )}
              <div className="field"><label>Role</label><CustomSelect value={role} onChange={changeRole} options={availableRoles} /></div>
              {!editing && (
                <div className="field">
                  <label>Temporary password</label>
                  <div className="input-action">
                    <input className="input" value={temp} onChange={(event) => setTemp(event.target.value)} />
                    <button type="button" onClick={() => setTemp(password())}>Generate</button>
                  </div>
                </div>
              )}
              <fieldset className="permission-grid dashboard-span-all">
                <legend><ShieldCheck size={17} /> Permissions</legend>
                {PERMISSIONS.map((item) => (
                  <label key={item}>
                    <input type="checkbox" checked={permissions.includes(item)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />
                    <span>{permissionLabels[item]}</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="appointment-panel-actions">
              <button type="button" className="btn btn-light" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving && <Loader2 className="toast-spinner" size={17} />} {editing ? "Save access" : "Create account"}</button>
            </div>
          </form>
        </div>
      )}
      {pendingDelete && (
        <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="delete-staff-title">
          <button className="appointment-modal-backdrop" aria-label="Close delete confirmation" onClick={() => setPendingDelete(null)} />
          <div className="appointment-panel">
            <div className="appointment-panel-heading">
              <div><span className="eyebrow">Permanent deletion</span><h2 id="delete-staff-title">Delete {pendingDelete.name}?</h2><p>This only succeeds when the account has no protected audit, payment, claim or clinical history. Otherwise disable the account.</p></div>
              <button type="button" aria-label="Close delete confirmation" onClick={() => setPendingDelete(null)}><X size={20} /></button>
            </div>
            <div className="appointment-panel-actions">
              <button type="button" className="btn btn-light" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="btn btn-danger" type="button" disabled={saving} onClick={deleteUser}>{saving ? <Loader2 className="toast-spinner" size={17} /> : <Trash2 size={17} />} Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StaffActions({
  user,
  currentId,
  saving,
  onEdit,
  onToggle,
  onReset,
  onDelete,
  canDelete,
}: {
  user: Staff;
  currentId: string;
  saving: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onReset: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="table-actions">
      <button className="icon-action" title="Edit role and permissions" aria-label={`Edit access for ${user.name}`} disabled={saving} onClick={onEdit}><ShieldCheck size={17} /></button>
      <button className="icon-action" title={user.active ? "Disable account" : "Enable account"} aria-label={`${user.active ? "Disable" : "Enable"} ${user.name}`} disabled={saving || user.id === currentId} onClick={onToggle}>{user.active ? <UserRoundX size={17} /> : <UserRoundCheck size={17} />}</button>
      {!user.platformAccount && <button className="icon-action" title="Reset temporary password" aria-label={`Reset password for ${user.name}`} disabled={saving} onClick={onReset}><KeyRound size={17} /></button>}
      {canDelete && <button className="icon-action danger-action" title="Delete staff account" aria-label={`Delete ${user.name}`} disabled={saving || user.id === currentId || user.role === "OWNER"} onClick={onDelete}><Trash2 size={17} /></button>}
    </div>
  );
}

function StaffAvatar({ user }: { user: Staff }) {
  if (user.avatarData) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="staff-avatar-image" src={user.avatarData} alt="" />;
  }
  return <span>{user.name.charAt(0)}</span>;
}
