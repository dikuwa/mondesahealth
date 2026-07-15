"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type Patient = {
  id: string;
  fullName: string;
  patientNumber: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  preferredMethod: string;
  medicalAid: string;
  medicalAidId: string;
  membershipNumber: string;
  visits: number;
};
type Fund = { id: string; name: string };
const genders = [
  { value: "", label: "Not recorded" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];
const communication = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone call" },
];

export function PatientManager({
  initial,
  funds,
}: {
  initial: Patient[];
  funds: Fund[];
}) {
  const router = useRouter();
  const [patients, setPatients] = useState(initial),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Patient | null>(null),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [deleting, setDeleting] = useState(""),
    [pendingArchive, setPendingArchive] = useState<Patient | null>(null);
  const [gender, setGender] = useState(""),
    [method, setMethod] = useState("WHATSAPP"),
    [fund, setFund] = useState(""),
    [birthDate, setBirthDate] = useState("");
  const visible = useMemo(
    () =>
      patients.filter((p) =>
        `${p.fullName} ${p.patientNumber} ${p.phone} ${p.email || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [patients, query],
  );
  useEffect(() => {
    // Refresh the optimistic client list after the server component supplies updated records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatients(initial);
  }, [initial]);
  function show(patient?: Patient) {
    setEditing(patient || null);
    setGender(patient?.gender || "");
    setMethod(patient?.preferredMethod || "WHATSAPP");
    setFund(patient?.medicalAidId || "");
    setBirthDate(patient?.dateOfBirth?.slice(0, 10) || "");
    setOpen(true);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const toastId = toast.loading(
      editing ? "Updating patient…" : "Creating patient…",
    );
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/patients", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          fullName: form.get("fullName"),
          dateOfBirth: birthDate,
          gender,
          phone: form.get("phone"),
          email: form.get("email"),
          preferredMethod: method,
          medicalAidId: fund,
          membershipNumber: String(form.get("membershipNumber") || ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(editing ? "Patient updated" : "Patient created", {
        id: toastId,
      });
      if (editing) {
        const fullName = String(form.get("fullName") || editing.fullName),
          phone = String(form.get("phone") || editing.phone),
          email = String(form.get("email") || "");
        setPatients((current) =>
          current.map((patient) =>
            patient.id === editing.id
              ? {
                  ...patient,
                  fullName,
                  phone,
                  email: email || null,
                  dateOfBirth: birthDate ? `${birthDate}T00:00:00.000Z` : null,
                  gender: gender || null,
                  preferredMethod: method,
                  medicalAidId: fund,
                  medicalAid:
                    funds.find((item) => item.id === fund)?.name || "",
                  membershipNumber: String(form.get("membershipNumber") || ""),
                }
              : patient,
          ),
        );
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save patient",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  async function archive(patient: Patient) {
    setDeleting(patient.id);
    const toastId = toast.loading("Archiving patient…");
    try {
      const response = await fetch(
        `/api/patients?id=${encodeURIComponent(patient.id)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Patient archived", { id: toastId });
      setPendingArchive(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not archive patient",
        { id: toastId },
      );
    } finally {
      setDeleting("");
    }
  }
  return (
    <>
      <div className="manager-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or patient number"
            aria-label="Search patients"
          />
        </div>
        <button className="btn btn-primary" onClick={() => show()}>
          <Plus size={17} /> Add patient
        </button>
      </div>
      <div className="card dashboard-card" style={{ padding: 20 }}>
        <div className="table-scroll">
          <table className="data-table patient-table">
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date of birth</th>
                <th>Phone</th>
                <th>Medical aid</th>
                <th>Visits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.fullName}</b>
                    <small style={{ display: "block" }}>
                      {p.patientNumber}
                    </small>
                  </td>
                  <td>
                    {p.dateOfBirth ? (
                      new Date(p.dateOfBirth).toLocaleDateString("en-NA")
                    ) : (
                      <span className="account-status">Incomplete</span>
                    )}
                  </td>
                  <td>{p.phone}</td>
                  <td>{p.medicalAid || "Private"}</td>
                  <td>{p.visits}</td>
                  <td>
                    <div className="table-actions">
                      <Link className="icon-action" href={`/dashboard/patients/${p.id}/medical-aid`} aria-label={`Benefits profile for ${p.fullName}`} title="Medical aid"><CreditCard size={16}/></Link>
                      <button
                        className="icon-action"
                        onClick={() => show(p)}
                        aria-label={`Edit ${p.fullName}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-action danger-action"
                        disabled={deleting === p.id}
                        onClick={() => setPendingArchive(p)}
                        aria-label={`Archive ${p.fullName}`}
                      >
                        {deleting === p.id ? (
                          <Loader2 className="toast-spinner" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="dashboard-empty">No patients match “{query}”.</div>
          )}
        </div>
      </div>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close patient form"
            onClick={() => setOpen(false)}
          />
          <form className="appointment-panel" onSubmit={submit}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Patient record</span>
                <h2>{editing ? "Edit patient" : "New patient"}</h2>
                <p>
                  Contact and funding details used across bookings, claims and
                  invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close patient form"
              >
                <X size={20} />
              </button>
            </div>
            <div className="appointment-form-grid">
              <div className="field dashboard-span-all">
                <label>Full legal name</label>
                <input
                  className="input"
                  name="fullName"
                  defaultValue={editing?.fullName}
                  required
                />
              </div>
              <div className="field">
                <label>
                  Date of birth <span>(optional)</span>
                </label>
                <DatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  ariaLabel="Date of birth"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="field">
                <label>Gender</label>
                <CustomSelect
                  ariaLabel="Gender"
                  value={gender}
                  onChange={setGender}
                  options={genders}
                />
              </div>
              <div className="field">
                <label>Cellphone</label>
                <input
                  className="input"
                  name="phone"
                  defaultValue={editing?.phone}
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  name="email"
                  type="email"
                  defaultValue={editing?.email || ""}
                />
              </div>
              <div className="field">
                <label>Preferred communication</label>
                <CustomSelect
                  ariaLabel="Preferred communication"
                  value={method}
                  onChange={setMethod}
                  options={communication}
                />
              </div>
              <div className="field">
                <label>Medical aid</label>
                <CustomSelect
                  ariaLabel="Medical aid"
                  value={fund}
                  onChange={setFund}
                  options={[
                    { value: "", label: "Private / none" },
                    ...funds.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
              </div>
              {fund && (
                <div className="field dashboard-span-all">
                  <label>Membership number</label>
                  <input
                    className="input"
                    name="membershipNumber"
                    defaultValue={editing?.membershipNumber}
                  />
                </div>
              )}
            </div>
            <div className="appointment-panel-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving && <Loader2 className="toast-spinner" size={17} />} Save
                patient
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmationDialog
        open={!!pendingArchive}
        title={`Archive ${pendingArchive?.fullName || "patient"}?`}
        description="This removes the patient from active lists while preserving linked appointments, claims, invoices, payments and audit history."
        confirmLabel="Archive patient"
        danger
        busy={!!deleting}
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => pendingArchive && archive(pendingArchive)}
      />
    </>
  );
}
