"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Building2,
  CheckSquare,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Stethoscope,
  Users,
  CreditCard,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { VerificationChecklist } from "@/components/verification-checklist";
import { PlatformAuditExplorer } from "@/components/platform-audit-explorer";

type Practice = {
  id: string;
  name: string;
  type: string;
  slug: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  registrationNumber: string | null;
  licenceInformation: string | null;
  address: string | null;
  town: string | null;
  region: string | null;
  description: string | null;
  status: string;
  publicVisible: boolean;
  suspensionReason: string | null;
  createdAt: string;
  activatedAt: string | null;
  _count: {
    users: number;
    patients: number;
    appointments: number;
    services: number;
    providers: number;
  };
  subscription: {
    planName: string;
    status: string;
  } | null;
};

type Tab = "overview" | "application" | "verification" | "documents" | "practitioners" | "locations" | "services" | "subscription" | "users" | "activity" | "settings";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "application", label: "Application", icon: FileText },
  { key: "verification", label: "Verification", icon: CheckSquare },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "practitioners", label: "Practitioners", icon: Stethoscope },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "services", label: "Services", icon: ChevronRight },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "users", label: "Users", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "settings", label: "Settings", icon: Settings },
];

function lifecycleLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_SETUP: "Pending setup",
    ONBOARDING: "Onboarding",
    PENDING_VERIFICATION: "Pending verification",
    ACTIVE_PRIVATE: "Active (private)",
    ACTIVE_PUBLIC: "Active (public)",
    SUSPENDED: "Suspended",
    DEACTIVATED: "Deactivated",
  };
  return labels[status] || status.replaceAll("_", " ");
}

export function PracticeRecordView({
  practice: initial,
  canManage,
}: {
  practice: Practice;
  canManage: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [practice, setPractice] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Application data
  const [application, setApplication] = useState<Record<string, unknown> | null>(null);
  const [applicationDocs, setApplicationDocs] = useState<Record<string, unknown>[]>([]);
  const [activityLogs, setActivityLogs] = useState<Record<string, unknown>[]>([]);
  const [locations, setLocations] = useState<Record<string, unknown>[]>([]);
  const [practitioners, setPractitioners] = useState<Record<string, unknown>[]>([]);

  // Settings form state
  const [formStatus, setFormStatus] = useState(practice.status);
  const [formPublic, setFormPublic] = useState(practice.publicVisible);

  // Update form state when practice changes
  useEffect(() => {
    setFormStatus(practice.status);
    setFormPublic(practice.publicVisible);
  }, [practice.status, practice.publicVisible]);

  // Fetch tab data on tab change
  useEffect(() => {
    if (activeTab === "application" || activeTab === "documents" || activeTab === "verification") {
      fetchApplicationData();
    }
    if (activeTab === "activity") {
      fetchActivityLogs();
    }
    if (activeTab === "locations" || activeTab === "practitioners") {
      fetchPracticeResources();
    }
  }, [activeTab, practice.id]);

  const fetchApplicationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/provider-applications?practiceId=${encodeURIComponent(practice.id)}`,
      );
      if (!response.ok) throw new Error("Failed to load application");
      const data = await response.json();
      if (data.application) {
        setApplication(data.application);
        if (activeTab === "documents") {
          const docsResponse = await fetch(
            `/api/provider-applications/documents?applicationId=${encodeURIComponent(data.application.id)}`,
          );
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            setApplicationDocs(docsData.documents || []);
          }
        }
      }
    } catch {
      // Application may not exist yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [practice.id, activeTab]);

  const fetchActivityLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/activity?practiceId=${encodeURIComponent(practice.id)}&limit=200`,
      );
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [practice.id]);

  const fetchPracticeResources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/platform/practices/${encodeURIComponent(practice.id)}/resources`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.locations) setLocations(data.locations);
        if (data.practitioners) setPractitioners(data.practitioners);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [practice.id]);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Saving practice…");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/platform/practices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          id: practice.id,
          status: formStatus,
          publicVisible: formPublic,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Practice updated", { id: toastId });
      setPractice((prev) => ({ ...prev, status: data.status || prev.status }));
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

  async function activatePractice(status: "ACTIVE_PRIVATE" | "ACTIVE_PUBLIC") {
    setSaving(true);
    const toastId = toast.loading("Activating practice…");
    try {
      const response = await fetch(
        `/api/platform/practices/${practice.id}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Practice activated", { id: toastId });
      setPractice((prev) => ({ ...prev, status }));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not activate practice",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="practice-record-view">
      {/* Tab navigation */}
      <div className="record-tabs">
        <nav className="record-tab-nav" aria-label="Practice record sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`record-tab ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="record-tab-content">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="record-section">
            <div className="dashboard-stats">
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Lifecycle</span>
                <b className="dashboard-stat-value">
                  {lifecycleLabel(practice.status)}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Staff</span>
                <b className="dashboard-stat-value">{practice._count.users}</b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Patients</span>
                <b className="dashboard-stat-value">
                  {practice._count.patients}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Appointments</span>
                <b className="dashboard-stat-value">
                  {practice._count.appointments}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Services</span>
                <b className="dashboard-stat-value">
                  {practice._count.services}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Providers</span>
                <b className="dashboard-stat-value">
                  {practice._count.providers}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Public profile</span>
                <b className="dashboard-stat-value">
                  {practice.publicVisible && practice.status.startsWith("ACTIVE")
                    ? "Published"
                    : "Private"}
                </b>
              </div>
              <div className="card dashboard-stat">
                <span className="dashboard-stat-label">Subscription</span>
                <b className="dashboard-stat-value">
                  {practice.subscription?.planName || "Unassigned"}
                </b>
              </div>
            </div>

            <div className="card dashboard-card" style={{ padding: 20 }}>
              <h3>Practice summary</h3>
              <div className="practice-summary-grid">
                <div className="summary-field">
                  <span className="summary-label">Practice name</span>
                  <span>{practice.name}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Type</span>
                  <span>{practice.type.replaceAll("_", " ")}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Owner</span>
                  <span>{practice.ownerName || "Not assigned"}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Email</span>
                  <span>{practice.email || "Not configured"}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Phone</span>
                  <span>{practice.phone || "Not configured"}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Registration</span>
                  <span>
                    {practice.registrationNumber || "Not provided"}
                  </span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Location</span>
                  <span>
                    {[practice.town, practice.region]
                      .filter(Boolean)
                      .join(", ") || "Not configured"}
                  </span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Registered</span>
                  <span>
                    {new Date(practice.createdAt).toLocaleDateString("en-NA")}
                  </span>
                </div>
                {practice.activatedAt && (
                  <div className="summary-field">
                    <span className="summary-label">Activated</span>
                    <span>
                      {new Date(practice.activatedAt).toLocaleDateString(
                        "en-NA",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {practice.description && (
              <div className="card dashboard-card" style={{ padding: 20 }}>
                <h3>Description</h3>
                <p>{practice.description}</p>
              </div>
            )}

            {canManage &&
              practice.status === "PENDING_VERIFICATION" && (
                <div className="card dashboard-card" style={{ padding: 20 }}>
                  <h3>Activation</h3>
                  <p>
                    This practice has completed onboarding and is awaiting
                    activation.
                  </p>
                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      disabled={saving}
                      onClick={() => activatePractice("ACTIVE_PRIVATE")}
                    >
                      {saving && <Loader2 className="toast-spinner" />}
                      Activate (private)
                    </button>
                    <button
                      className="btn btn-light"
                      disabled={saving}
                      onClick={() => activatePractice("ACTIVE_PUBLIC")}
                    >
                      {saving && <Loader2 className="toast-spinner" />}
                      Activate (public)
                    </button>
                  </div>
                </div>
              )}

            {canManage &&
              practice.status === "ACTIVE_PRIVATE" && (
                <div className="card dashboard-card" style={{ padding: 20 }}>
                  <h3>Publish</h3>
                  <p>
                    The practice is active privately. Publish to make it
                    publicly visible and bookable.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => activatePractice("ACTIVE_PUBLIC")}
                  >
                    {saving && <Loader2 className="toast-spinner" />}
                    Publish public profile
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Application */}
        {activeTab === "application" && (
          <div className="record-section">
            {loading ? (
              <div className="checklist-loading">
                <Loader2 className="toast-spinner" size={18} />
                Loading application…
              </div>
            ) : application ? (
              <div className="card dashboard-card" style={{ padding: 20 }}>
                <h3>Application details</h3>
                <div className="practice-summary-grid">
                  {Object.entries(
                    application as Record<string, unknown>,
                  ).map(([key, value]) => {
                    const v = value as string | number | boolean | null;
                    if (
                      ["id", "practiceId", "assignedReviewerId", "secureAccessToken", "secureAccessTokenExpiresAt"].includes(key)
                    )
                      return null;
                    if (["createdAt", "updatedAt", "submittedAt"].includes(key))
                      return (
                        <div key={key} className="summary-field">
                          <span className="summary-label">
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (l) => l.toUpperCase())}
                          </span>
                          <span>
                            {v
                              ? new Date(String(v)).toLocaleDateString("en-NA")
                              : "—"}
                          </span>
                        </div>
                      );
                    return (
                      <div key={key} className="summary-field">
                        <span className="summary-label">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (l) => l.toUpperCase())}
                        </span>
                        <span>{v ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>No application linked</h3>
                <p>
                  This practice does not have a linked application record.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Verification */}
        {activeTab === "verification" && (
          <div className="record-section">
            {application ? (
              <VerificationChecklist
                applicationId={(application as { id: string }).id}
              />
            ) : (
              <div className="dashboard-empty">
                <h3>No application linked</h3>
                <p>
                  Link an application to this practice to use the verification
                  checklist.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <div className="record-section">
            {loading ? (
              <div className="checklist-loading">
                <Loader2 className="toast-spinner" size={18} />
                Loading documents…
              </div>
            ) : applicationDocs.length > 0 ? (
              <div className="document-grid">
                {applicationDocs.map((doc) => {
                  const d = doc as Record<string, unknown>;
                  const versions = (d.versions as Record<string, unknown>[]) || [];
                  const latest = versions[0] as Record<string, unknown> | undefined;
                  const latestId = latest?.id as string | undefined;
                  const latestSize = latest?.size as number | undefined;
                  const latestUploadedAt = latest?.uploadedAt as string | undefined;
                  const latestReviewer = latest?.reviewer as Record<string, string> | undefined;
                  const hasData = Boolean(latest?.data);
                  return (
                    <div key={d.id as string} className="card dashboard-card document-card">
                      <div className="document-card-header">
                        <StatusBadge value={(d.reviewStatus || d.currentReviewStatus || "UPLOADED") as string} />
                        <small>v{d.currentVersion as number}</small>
                      </div>
                      <h4>{d.category as string}</h4>
                      {latestId && (
                        <div className="document-card-meta">
                          <span>{latestSize ? (latestSize / 1024).toFixed(0) : "0"} KB</span>
                          <span>{latestUploadedAt ? new Date(latestUploadedAt).toLocaleDateString("en-NA") : "—"}</span>
                          {latestReviewer && (
                            <span>Reviewed: {latestReviewer.name}</span>
                          )}
                        </div>
                      )}
                      {hasData && latestId && (
                        <a
                          className="btn btn-light btn-sm"
                          href={`/api/provider-applications/serve/${latestId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText size={14} /> Preview
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>No documents</h3>
                <p>No application documents have been uploaded for this practice.</p>
              </div>
            )}
          </div>
        )}

        {/* Practitioners */}
        {activeTab === "practitioners" && (
          <div className="record-section">
            {loading ? (
              <div className="checklist-loading">
                <Loader2 className="toast-spinner" size={18} />
                Loading practitioners…
              </div>
            ) : practitioners.length > 0 ? (
              <div className="card dashboard-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Title</th>
                        <th>Registration</th>
                        <th>Phone</th>
                        <th>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practitioners.map((p) => {
                        const practitioner = p as Record<string, unknown>;
                        return (
                          <tr key={practitioner.id as string}>
                            <td><b>{practitioner.fullName as string || (practitioner.name as string)}</b></td>
                            <td>{practitioner.professionalTitle as string || "—"}</td>
                            <td>{practitioner.registrationNumber as string || "—"}</td>
                            <td>{practitioner.phone as string || "—"}</td>
                            <td>
                              <StatusBadge value={(practitioner.active as boolean) ? "ACTIVE" : "INACTIVE"} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>No practitioners</h3>
                <p>No practitioners have been configured for this practice.</p>
              </div>
            )}
          </div>
        )}

        {/* Locations */}
        {activeTab === "locations" && (
          <div className="record-section">
            {loading ? (
              <div className="checklist-loading">
                <Loader2 className="toast-spinner" size={18} />
                Loading locations…
              </div>
            ) : locations.length > 0 ? (
              <div className="card dashboard-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Address</th>
                        <th>Town</th>
                        <th>Phone</th>
                        <th>Public</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((l) => {
                        const loc = l as Record<string, unknown>;
                        return (
                          <tr key={loc.id as string}>
                            <td><b>{loc.branchName as string || loc.name as string}</b></td>
                            <td>{loc.address as string || "—"}</td>
                            <td>{loc.town as string || "—"}</td>
                            <td>{loc.phone as string || "—"}</td>
                            <td>
                              <StatusBadge value={(loc.public as boolean || loc.publicVisible as boolean) ? "ACTIVE" : "PRIVATE"} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>No locations</h3>
                <p>No locations have been configured for this practice.</p>
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {activeTab === "services" && (
          <div className="record-section">
            {practice._count.services > 0 ? (
              <p className="notice-info">
                Service management is handled within the practice workspace.
                Overview count: {practice._count.services} services configured.
              </p>
            ) : (
              <div className="dashboard-empty">
                <h3>No services</h3>
                <p>
                  Services will be configured during the practice onboarding
                  process.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Subscription */}
        {activeTab === "subscription" && (
          <div className="record-section">
            {practice.subscription ? (
              <div className="card dashboard-card" style={{ padding: 20 }}>
                <h3>Current subscription</h3>
                <div className="practice-summary-grid">
                  <div className="summary-field">
                    <span className="summary-label">Plan</span>
                    <span>{practice.subscription.planName}</span>
                  </div>
                  <div className="summary-field">
                    <span className="summary-label">Status</span>
                    <span>
                      <StatusBadge value={practice.subscription.status} />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card dashboard-card" style={{ padding: 20 }}>
                <h3>No subscription</h3>
                <p>
                  This practice has not been assigned a subscription plan.
                </p>
              </div>
            )}
            {canManage && (
              <div className="card dashboard-card" style={{ padding: 20, marginTop: 16 }}>
                <h3>Manage subscription</h3>
                <p>
                  Subscription plan changes are handled through the platform
                  subscription management interface.
                </p>
                <Link className="btn btn-light" href="/platform/subscriptions">
                  Subscription management
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="record-section">
            <div className="card dashboard-card" style={{ padding: 20 }}>
              <h3>Practice staff</h3>
              <p>
                Staff management is handled within the practice workspace.
                Overview count: {practice._count.users} staff members.
              </p>
              {practice._count.users > 0 && (
                <Link
                  className="btn btn-light"
                  href={`/dashboard?practice=${practice.id}`}
                >
                  <Users size={15} /> View in workspace
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Activity */}
        {activeTab === "activity" && (
          <div className="record-section">
            {loading ? (
              <div className="checklist-loading">
                <Loader2 className="toast-spinner" size={18} />
                Loading activity…
              </div>
            ) : (
              <PlatformAuditExplorer
                logs={(activityLogs as { id: string; action: string; user?: { name: string }; summary: string; practiceId: string | null; createdAt: string }[]).map(
                  (log) => ({
                    id: log.id,
                    action: log.action,
                    actor: log.user?.name ?? "System",
                    summary: log.summary,
                    practiceId: log.practiceId,
                    createdAt: log.createdAt,
                  }),
                )}
              />
            )}
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <div className="record-section">
            {canManage ? (
              <form
                className="card dashboard-card content-card"
                onSubmit={saveSettings}
              >
                <div className="form-grid">
                  <label className="field">
                    <span>Practice name</span>
                    <input
                      className="input"
                      name="name"
                      defaultValue={practice.name}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Practice type</span>
                    <input
                      className="input"
                      name="type"
                      defaultValue={practice.type}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Owner name</span>
                    <input
                      className="input"
                      name="ownerName"
                      defaultValue={practice.ownerName || ""}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Owner email</span>
                    <input
                      className="input"
                      name="ownerEmail"
                      type="email"
                      defaultValue={practice.email || ""}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Registration number</span>
                    <input
                      className="input"
                      name="registrationNumber"
                      defaultValue={practice.registrationNumber || ""}
                    />
                  </label>
                  <label className="field">
                    <span>Phone</span>
                    <input
                      className="input"
                      name="phone"
                      defaultValue={practice.phone || ""}
                    />
                  </label>
                  <label className="field">
                    <span>WhatsApp</span>
                    <input
                      className="input"
                      name="whatsapp"
                      defaultValue={practice.whatsapp || ""}
                    />
                  </label>
                  <label className="field">
                    <span>Address</span>
                    <input
                      className="input"
                      name="address"
                      defaultValue={practice.address || ""}
                    />
                  </label>
                  <label className="field">
                    <span>Town</span>
                    <input
                      className="input"
                      name="town"
                      defaultValue={practice.town || ""}
                    />
                  </label>
                  <label className="field">
                    <span>Region</span>
                    <input
                      className="input"
                      name="region"
                      defaultValue={practice.region || ""}
                    />
                  </label>
                  <label className="field">
                    <span>Lifecycle status</span>
                    <CustomSelect
                      value={formStatus}
                      onChange={(value) => {
                        setFormStatus(value);
                        if (
                          !["ACTIVE_PRIVATE", "ACTIVE_PUBLIC"].includes(value)
                        )
                          setFormPublic(false);
                      }}
                      options={[
                        "PENDING_SETUP",
                        "ONBOARDING",
                        "PENDING_VERIFICATION",
                        "ACTIVE_PRIVATE",
                        "ACTIVE_PUBLIC",
                        "SUSPENDED",
                        "DEACTIVATED",
                      ].map((value) => ({
                        value,
                        label: lifecycleLabel(value),
                      }))}
                    />
                  </label>
                  <label className="field field-span-2">
                    <span>Description</span>
                    <textarea
                      className="input"
                      name="description"
                      defaultValue={practice.description || ""}
                    />
                  </label>
                  <label className="field field-span-2">
                    <span>Suspension reason</span>
                    <textarea
                      className="input"
                      name="suspensionReason"
                      defaultValue={practice.suspensionReason || ""}
                    />
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={formPublic}
                      disabled={
                        !["ACTIVE_PRIVATE", "ACTIVE_PUBLIC"].includes(
                          formStatus,
                        )
                      }
                      onChange={(event) =>
                        setFormPublic(event.target.checked)
                      }
                    />
                    <span>Visible in public marketplace</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save practice"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="notice-info">
                This role has read-only access to verified practice details.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
