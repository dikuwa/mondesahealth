"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Clipboard, Loader2, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
type Practice = {
  id: string;
  name: string;
  type: string;
  ownerName: string | null;
  email: string | null;
  town: string | null;
  status: string;
  publicVisible: boolean;
  subscriptionStatus: string;
};
const statuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "ACTIVE",
  "PAYMENT_OVERDUE",
  "SUSPENDED",
  "REJECTED",
  "CLOSED",
].map((value) => ({ value, label: value.replaceAll("_", " ") }));
export function PracticeManager({
  initial,
  plans,
  serviceTemplates,
  canManage,
}: {
  initial: Practice[];
  plans: { id: string; name: string }[];
  serviceTemplates: { id: string; name: string; department: string }[];
  canManage: boolean;
}) {
  const router = useRouter(),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [status, setStatus] = useState("DRAFT"),
    [planId, setPlanId] = useState(""),
    [initialServiceIds, setInitialServiceIds] = useState<string[]>([]),
    [sendInvitationEmail, setSendInvitationEmail] = useState(false),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [invite, setInvite] = useState(""),
    [pending, setPending] = useState<{
      practice: Practice;
      status: string;
    } | null>(null);
  const visible = initial.filter((practice) => {
    const text = `${practice.name} ${practice.ownerName || ""} ${practice.email || ""} ${practice.town || ""}`.toLowerCase();
    return (!statusFilter || practice.status === statusFilter) && text.includes(query.trim().toLowerCase());
  });
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Registering practice…"),
      form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/platform/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          status,
          planId: planId || undefined,
          initialServiceIds,
          sendInvitationEmail,
          publicVisible: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInvite(`${location.origin}${data.inviteUrl}`);
      setOpen(false);
      toast.success(
        data.emailDelivery?.sent
          ? "Practice registered and invitation emailed"
          : data.emailDelivery
            ? data.emailDelivery.reason
            : "Practice registered and invitation created",
        { id: toastId },
      );
      setInitialServiceIds([]);
      setSendInvitationEmail(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not register practice",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  async function change() {
    if (!pending) return;
    setSaving(true);
    const toastId = toast.loading("Updating practice…");
    try {
      const response = await fetch("/api/platform/practices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pending.practice.id,
          status: pending.status,
          publicVisible: pending.status === "ACTIVE",
          suspensionReason:
            pending.status === "SUSPENDED"
              ? "Suspended by platform owner"
              : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Practice status updated", { id: toastId });
      setPending(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update practice",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {invite && (
        <div className="password-copy-banner">
          <Clipboard size={20} />
          <div>
            <b>Owner invitation ready</b>
            <code>{invite}</code>
            <small>
              Send this expiring setup link through an approved channel.
            </small>
          </div>
          <button
            className="btn btn-light"
            onClick={() => navigator.clipboard.writeText(invite)}
          >
            Copy link
          </button>
          <button className="icon-action" onClick={() => setInvite("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="manager-toolbar">
        <div>
          <h2>Registered practices</h2>
          <p>
            Approval, public visibility and subscription status remain
            independently controlled.
          </p>
        </div>
        {canManage && <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Register practice
        </button>}
      </div>
      <div className="manager-toolbar platform-filter-toolbar">
        <div className="search-box"><Search size={17}/><input className="input" aria-label="Search practices" placeholder="Search practice, owner, email or town" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
        <CustomSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "", label: "All statuses" }, ...statuses]}/>
      </div>
      <div className="card dashboard-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Practice</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <small style={{ display: "block" }}>
                      {item.type.replaceAll("_", " ")}
                    </small>
                  </td>
                  <td>
                    {item.ownerName || "Not assigned"}
                    <small style={{ display: "block" }}>{item.email}</small>
                  </td>
                  <td>{item.town || "Not configured"}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <StatusBadge value={item.subscriptionStatus} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link className="btn btn-light" href={`/platform/practices/${item.id}`}>Open</Link>
                      {canManage && !["ACTIVE", "SUSPENDED"].includes(item.status) && (
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            setPending({ practice: item, status: "ACTIVE" })
                          }
                        >
                          Approve
                        </button>
                      )}
                      {canManage && item.status === "ACTIVE" && (
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            setPending({ practice: item, status: "SUSPENDED" })
                          }
                        >
                          Suspend
                        </button>
                      )}
                      {canManage && item.status === "SUSPENDED" && (
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            setPending({ practice: item, status: "ACTIVE" })
                          }
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="dashboard-empty"><h3>No matching practices</h3><p>{initial.length ? "Change the search or status filter." : "Register the first subscribed practice."}</p></div>
        )}
      </div>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close practice form"
          />
          <form className="appointment-panel platform-dialog-wide" onSubmit={create}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Platform administration</span>
                <h2>Register practice</h2>
                <p>
                  A secure setup link is always created. Email delivery is
                  optional and never automatic.
                </p>
              </div>
              <button
                type="button"
                className="icon-action"
                aria-label="Close practice registration"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label>
                <span>Practice name</span>
                <input className="input" name="name" required />
              </label>
              <label>
                <span>Practice type</span>
                <input
                  className="input"
                  name="type"
                  placeholder="GENERAL_PRACTICE"
                  required
                />
              </label>
              <label>
                <span>Owner name</span>
                <input className="input" name="ownerName" required />
              </label>
              <label>
                <span>Owner email</span>
                <input
                  className="input"
                  name="ownerEmail"
                  type="email"
                  required
                />
              </label>
              <label>
                <span>Registration number</span>
                <input className="input" name="registrationNumber" />
              </label>
              <label>
                <span>Professional licence</span>
                <input className="input" name="licenceInformation" />
              </label>
              <label>
                <span>Phone</span>
                <input className="input" name="phone" />
              </label>
              <label>
                <span>Town</span>
                <input className="input" name="town" />
              </label>
              <label>
                <span>Region</span>
                <input className="input" name="region" />
              </label>
              <label>
                <span>Initial status</span>
                <CustomSelect
                  value={status}
                  onChange={setStatus}
                  options={statuses}
                />
              </label>
              <label>
                <span>Subscription plan</span>
                <CustomSelect
                  value={planId}
                  onChange={setPlanId}
                  options={[
                    { value: "", label: "Assign later" },
                    ...plans.map((x) => ({ value: x.id, label: x.name })),
                  ]}
                />
              </label>
              <fieldset className="field field-span-2 service-template-picker">
                <legend>Initial services</legend>
                <p>
                  Select the service templates to copy into this practice.
                  They start private until the practice publishes them.
                </p>
                <div className="checkbox-grid">
                  {serviceTemplates.map((service) => (
                    <label className="toggle-label" key={service.id}>
                      <input
                        type="checkbox"
                        checked={initialServiceIds.includes(service.id)}
                        onChange={(event) =>
                          setInitialServiceIds((current) =>
                            event.target.checked
                              ? [...current, service.id]
                              : current.filter((id) => id !== service.id),
                          )
                        }
                      />
                      <span>
                        {service.name}
                        <small>{service.department}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {!serviceTemplates.length && (
                  <small>No active service templates are available.</small>
                )}
              </fieldset>
              <label className="toggle-label field-span-2">
                <input
                  type="checkbox"
                  checked={sendInvitationEmail}
                  onChange={(event) =>
                    setSendInvitationEmail(event.target.checked)
                  }
                />
                <span>
                  Email the invitation now
                  <small>
                    Optional. Leave off to copy and send the link yourself.
                  </small>
                </span>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <Loader2 className="toast-spinner" />
                ) : (
                  <Building2 size={16} />
                )}{" "}
                Register practice
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(pending)}
        title={`${pending?.status === "SUSPENDED" ? "Suspend" : "Activate"} practice?`}
        description={
          pending?.status === "SUSPENDED"
            ? "Public booking will be disabled, while clinical records remain preserved."
            : "The practice will become active and publicly bookable."
        }
        confirmLabel={
          pending?.status === "SUSPENDED"
            ? "Suspend practice"
            : "Activate practice"
        }
        danger={pending?.status === "SUSPENDED"}
        busy={saving}
        onCancel={() => setPending(null)}
        onConfirm={change}
      />
    </>
  );
}
