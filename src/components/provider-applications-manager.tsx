"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformDialog } from "@/components/ui/platform-dialog";
import { practiceTypeLabel } from "@/lib/practice-registration-options";
import { REJECTION_CATEGORY_OPTIONS } from "@/lib/rejection-categories";
import { VerificationChecklist } from "@/components/verification-checklist";
import { ApplicationDocumentReview } from "@/components/application-document-review";
import { Eye, Search } from "lucide-react";

type Application = {
  id: string;
  practiceName: string;
  practiceType: string;
  ownerName: string;
  email: string;
  phone: string | null;
  registrationNumber: string | null;
  town: string | null;
  region: string | null;
  description: string | null;
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
  const [rejectionCategory, setRejectionCategory] = useState("");
  const [rejectionExplanation, setRejectionExplanation] = useState("");
  const [planId, setPlanId] = useState("");
  const [initialServiceIds, setInitialServiceIds] = useState<string[]>([]);
  const [sendInvitationEmail, setSendInvitationEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const visible = applications.filter((item) => (!statusFilter || item.status === statusFilter) && `${item.practiceName} ${item.ownerName} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase()));

  function closeDecision() {
    setPending(null);
    setNotes("");
    setRejectionCategory("");
    setRejectionExplanation("");
    setPlanId("");
    setInitialServiceIds([]);
    setSendInvitationEmail(false);
  }

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
          rejectionCategory:
            pending.action === "REJECT" ? rejectionCategory : undefined,
          rejectionReason:
            pending.action === "REJECT" ? rejectionExplanation : undefined,
          planId: planId || undefined,
          initialServiceIds:
            pending.action === "APPROVE" ? initialServiceIds : [],
          sendInvitationEmail:
            pending.action === "APPROVE" && sendInvitationEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      if (data.inviteUrl) setInvite(`${location.origin}${data.inviteUrl}`);
      toast.success(
        data.emailDelivery?.sent
          ? "Application approved and invitation emailed"
          : data.emailDelivery
            ? data.emailDelivery.reason
            : "Application updated",
        { id: toastId },
      );
      closeDecision();
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
                    <small>{practiceTypeLabel(item.practiceType)}</small>
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
                      <button className="btn btn-light" onClick={() => setSelected(item)}>
                        <Eye size={15} /> Details
                      </button>
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
      <PlatformDialog
        open={pending?.action === "APPROVE"}
        eyebrow="Application approval"
        title={pending ? `Approve ${pending.item.practiceName}` : "Approve practice"}
        description="Confirm the starting subscription and services. Approval creates a private workspace and secure owner invitation."
        onClose={closeDecision}
        wide
        actions={<>
          <button className="btn btn-light" type="button" onClick={closeDecision}>Cancel</button>
          <button className="btn btn-primary" type="button" disabled={saving} onClick={decide}>{saving ? "Approving…" : "Approve and create workspace"}</button>
        </>}
      >
        <div className="approval-options">
          {pending && <div className="approval-application-summary">
            <div><span>Primary owner</span><strong>{pending.item.ownerName}</strong><small>{pending.item.email}</small></div>
            <div><span>Practice location</span><strong>{[pending.item.town, pending.item.region].filter(Boolean).join(", ") || "Not provided"}</strong><small>{pending.item.phone || "No phone provided"}</small></div>
          </div>}
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
          <label className="field">
            <span>Approval notes</span>
            <textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional internal note for the audit trail" />
          </label>
        </div>
      </PlatformDialog>
      <PlatformDialog
        open={Boolean(selected)}
        eyebrow="Submitted application"
        title={selected?.practiceName || "Practice application"}
        description="The verified core fields below are also used when a platform administrator registers a practice manually."
        onClose={() => setSelected(null)}
        wide
        actions={<>
          <button className="btn btn-light" type="button" onClick={() => setSelected(null)}>Close</button>
          {canManage && selected && ["SUBMITTED", "UNDER_REVIEW"].includes(selected.status) && <>
            <button className="btn btn-light" type="button" onClick={() => { setPending({ item: selected, action: "REVIEW" }); setSelected(null); }}>Mark under review</button>
            <button className="btn btn-primary" type="button" onClick={() => { setPending({ item: selected, action: "APPROVE" }); setSelected(null); }}>Approve application</button>
          </>}
        </>}
      >
        {selected && <>
          <div className="application-detail-grid">
            <div><span>Practice type</span><strong>{practiceTypeLabel(selected.practiceType)}</strong></div>
            <div><span>Status</span><StatusBadge value={selected.status} /></div>
            <div><span>Primary owner</span><strong>{selected.ownerName}</strong></div>
            <div><span>Owner email</span><strong>{selected.email}</strong></div>
            <div><span>Phone number</span><strong>{selected.phone || "Not provided"}</strong></div>
            <div><span>Registration number</span><strong>{selected.registrationNumber || "Not provided"}</strong></div>
            <div><span>Town or city</span><strong>{selected.town || "Not provided"}</strong></div>
            <div><span>Region</span><strong>{selected.region || "Not provided"}</strong></div>
            {selected.description && <div className="application-detail-description"><span>Legacy application description</span><p>{selected.description}</p></div>}
          </div>
          {canManage && <VerificationChecklist applicationId={selected.id} />}
          <ApplicationDocumentReview applicationId={selected.id} />
        </>}
      </PlatformDialog>
      <PlatformDialog
        open={pending?.action === "REJECT"}
        eyebrow="Application rejection"
        title={pending ? `Reject ${pending.item.practiceName}` : "Reject application"}
        description="Select a rejection category and provide an explanation. The application and its documents are retained for audit purposes."
        onClose={closeDecision}
        wide
        actions={<>
          <button className="btn btn-light" type="button" onClick={closeDecision}>Cancel</button>
          <button className="btn btn-danger" type="button" disabled={saving || !rejectionCategory} onClick={decide}>{saving ? "Rejecting…" : "Reject application"}</button>
        </>}
      >
        <div className="rejection-options">
          {pending && <div className="approval-application-summary">
            <div><span>Practice</span><strong>{pending.item.practiceName}</strong><small>{pending.item.ownerName}</small></div>
          </div>}
          <label className="field">
            <span>Rejection category *</span>
            <CustomSelect
              value={rejectionCategory}
              onChange={setRejectionCategory}
              options={REJECTION_CATEGORY_OPTIONS}
            />
          </label>
          <label className="field">
            <span>Explanation for the applicant</span>
            <textarea className="input" rows={3} value={rejectionExplanation} onChange={(event) => setRejectionExplanation(event.target.value)} placeholder="Provide a clear reason the applicant can see…" />
          </label>
          <label className="field">
            <span>Internal review notes</span>
            <textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional internal note for the audit trail" />
          </label>
        </div>
      </PlatformDialog>
      <PromptDialog
        open={Boolean(pending && pending.action === "REVIEW")}
        title="Mark as under review"
        description="Record a concise review note for the audit trail."
        label="Review notes"
        value={notes}
        onChange={setNotes}
        confirmLabel="Mark as under review"
        busy={saving}
        onCancel={closeDecision}
        onConfirm={decide}
      />
    </>
  );
}
