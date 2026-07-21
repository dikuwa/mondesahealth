"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search } from "lucide-react";

type Application = {
  id: string;
  practiceName: string;
  practiceType: string;
  ownerName: string;
  email: string;
  status: string;
  createdAt: string;
};

export function ProviderApplicationsManager({
  applications,
  plans,
  serviceTemplates,
  canManage,
}: {
  applications: Application[];
  plans: { id: string; name: string }[];
  serviceTemplates: { id: string; name: string; department: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<{
    item: Application;
    action: "REVIEW" | "APPROVE" | "REJECT";
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState("");
  const [initialServiceIds, setInitialServiceIds] = useState<string[]>([]);
  const [sendInvitationEmail, setSendInvitationEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const visible = applications.filter((item) => (!statusFilter || item.status === statusFilter) && `${item.practiceName} ${item.ownerName} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function decide() {
    if (!pending) return;
    setSaving(true);
    const toastId = toast.loading("Updating application…");
    try {
      const response = await fetch("/api/provider-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pending.item.id,
          action: pending.action,
          reviewNotes: notes,
          planId: planId || undefined,
          initialServiceIds:
            pending.action === "APPROVE" ? initialServiceIds : [],
          sendInvitationEmail:
            pending.action === "APPROVE" && sendInvitationEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.inviteUrl) setInvite(`${location.origin}${data.inviteUrl}`);
      toast.success(
        data.emailDelivery?.sent
          ? "Application approved and invitation emailed"
          : data.emailDelivery
            ? data.emailDelivery.reason
            : "Application updated",
        { id: toastId },
      );
      setPending(null);
      setNotes("");
      setInitialServiceIds([]);
      setSendInvitationEmail(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update application",
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
          <div>
            <b>Approved owner invitation</b>
            <code>{invite}</code>
          </div>
          <button
            className="btn btn-light"
            onClick={() => navigator.clipboard.writeText(invite)}
          >
            Copy link
          </button>
        </div>
      )}
      <div className="manager-toolbar platform-filter-toolbar"><div className="search-box"><Search size={17}/><input className="input" aria-label="Search applications" placeholder="Search practice, owner or email" value={query} onChange={(event) => setQuery(event.target.value)}/></div><CustomSelect value={statusFilter} onChange={setStatusFilter} options={[{value:"",label:"All statuses"},...["SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED"].map((value)=>({value,label:value.replaceAll("_"," ")}))]}/></div>
      <div className="card dashboard-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Practice</th>
                <th>Owner</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.practiceName}</b>
                    <small>{item.practiceType}</small>
                  </td>
                  <td>
                    {item.ownerName}
                    <small>{item.email}</small>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString("en-NA")}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      {canManage && item.status === "SUBMITTED" && (
                        <button
                          className="btn btn-light"
                          onClick={() => setPending({ item, action: "REVIEW" })}
                        >
                          Review
                        </button>
                      )}
                      {canManage && ["SUBMITTED", "UNDER_REVIEW"].includes(item.status) && (
                        <>
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              setPending({ item, action: "APPROVE" })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-light"
                            onClick={() =>
                              setPending({ item, action: "REJECT" })
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <div className="dashboard-empty"><h3>No matching applications</h3><p>Change the filters or wait for a new registration.</p></div>}
      </div>
      {pending?.action === "APPROVE" && (
        <div className="card dashboard-card approval-options">
          <label className="field">
            <span>Subscription plan for approval</span>
            <CustomSelect
              value={planId}
              onChange={setPlanId}
              options={[
                { value: "", label: "Assign later" },
                ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
              ]}
            />
          </label>
          <fieldset className="field service-template-picker">
            <legend>Initial services</legend>
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
          </fieldset>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={sendInvitationEmail}
              onChange={(event) => setSendInvitationEmail(event.target.checked)}
            />
            <span>
              Email the invitation after approval
              <small>Optional and off by default.</small>
            </span>
          </label>
        </div>
      )}
      <PromptDialog
        open={Boolean(pending)}
        title={`${pending?.action.toLowerCase()} provider application`}
        description={
          pending?.action === "APPROVE"
            ? "Approval creates the practice and a secure owner invitation. Public visibility remains disabled."
            : "Record a concise review note for the audit trail."
        }
        label="Review notes"
        value={notes}
        onChange={setNotes}
        confirmLabel={pending?.action || "Update"}
        busy={saving}
        onCancel={() => setPending(null)}
        onConfirm={decide}
      />
    </>
  );
}
