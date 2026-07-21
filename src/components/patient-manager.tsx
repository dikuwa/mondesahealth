"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type Patient = {
  id: string;
  fullName: string;
  patientNumber: string;
  createdAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  preferredMethod: string;
  medicalAid: string;
  medicalAidId: string;
  membershipNumber: string;
  visits: number;
  appointmentReferences: string[];
  hasUpcoming: boolean;
  lastVisit: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  identificationType?: string | null;
  identityNumber?: string | null;
  passportNumber?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  town?: string | null;
  region?: string | null;
  emergencyName?: string | null;
  emergencyRelation?: string | null;
  emergencyPhone?: string | null;
  knownAllergies?: string | null;
  chronicConditions?: string | null;
  currentMedication?: string | null;
  previousProcedures?: string | null;
  medicalAlerts?: string | null;
  medicalHistorySummary?: string | null;
  status?: string;
};
type Fund = { id: string; name: string };
type PatientMatch = {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  maskedId: string | null;
  maskedPhone: string | null;
  lastVisit: string | null;
};
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
const patientSortOptions = [
  { value: "NAME_ASC", label: "Name A–Z" },
  { value: "NAME_DESC", label: "Name Z–A" },
  { value: "CREATED_DESC", label: "Newest patients" },
  { value: "CREATED_ASC", label: "Oldest patients" },
  { value: "VISITS_DESC", label: "Most visits" },
];
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const localPhone = (phone: string) => {
  const digits = digitsOnly(phone);
  return digits.startsWith("264") ? `0${digits.slice(3)}` : digits;
};

export function PatientManager({
  initial,
  funds,
  canManageSickNotes = false,
  initialEditId,
}: {
  initial: Patient[];
  funds: Fund[];
  canManageSickNotes?: boolean;
  initialEditId?: string;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState(initial),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Patient | null>(null),
    [open, setOpen] = useState(false),
    [sort, setSort] = useState("NAME_ASC"),
    [profileFilter, setProfileFilter] = useState("ALL"),
    [statusFilter, setStatusFilter] = useState("ALL"),
    [fundingFilter, setFundingFilter] = useState("ALL"),
    [visitFilter, setVisitFilter] = useState("ALL"),
    [clinicalFilter, setClinicalFilter] = useState("ALL"),
    [regionFilter, setRegionFilter] = useState("ALL"),
    [saving, setSaving] = useState(false),
    [deleting, setDeleting] = useState(""),
    [pendingArchive, setPendingArchive] = useState<Patient | null>(null),
    [dirty, setDirty] = useState(false),
    [discarding, setDiscarding] = useState(false);
  const [possibleMatches, setPossibleMatches] = useState<PatientMatch[]>([]);
  const [pendingCreate, setPendingCreate] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [gender, setGender] = useState(""),
    [method, setMethod] = useState("WHATSAPP"),
    [fund, setFund] = useState(""),
    [birthDate, setBirthDate] = useState(""),
    [identificationType, setIdentificationType] = useState(""),
    [patientStatus, setPatientStatus] = useState("ACTIVE");
  const visible = useMemo(
    () =>
      patients
        .filter((p) => {
          const term = query.trim().toLowerCase();
          const digitTerm = digitsOnly(term);
          const text =
            `${p.fullName} ${p.patientNumber} ${p.phone} ${localPhone(p.phone)} ${p.email || ""} ${p.identityNumber || ""} ${p.passportNumber || ""} ${p.medicalAid} ${p.membershipNumber} ${p.appointmentReferences.join(" ")}`.toLowerCase();
          const matchesSearch =
            text.includes(term) ||
            Boolean(digitTerm && digitsOnly(text).includes(digitTerm));
          const incomplete =
            !p.dateOfBirth ||
            !p.gender ||
            (!p.identityNumber && !p.passportNumber);
          const lastVisitAge = p.lastVisit
            ? Date.now() - new Date(p.lastVisit).getTime()
            : null;
          const matchesProfile =
            profileFilter === "ALL" ||
            (profileFilter === "COMPLETE" && !incomplete) ||
            (profileFilter === "INCOMPLETE" && incomplete);
          const matchesStatus =
            statusFilter === "ALL" || p.status === statusFilter;
          const matchesFunding =
            fundingFilter === "ALL" ||
            (fundingFilter === "PRIVATE" && !p.medicalAid) ||
            (fundingFilter === "MEDICAL_AID" && Boolean(p.medicalAid)) ||
            p.medicalAidId === fundingFilter;
          const matchesVisit =
            visitFilter === "ALL" ||
            (visitFilter === "UPCOMING" && p.hasUpcoming) ||
            (visitFilter === "NEVER" && !p.lastVisit) ||
            (visitFilter === "30_DAYS" &&
              lastVisitAge !== null &&
              lastVisitAge <= 30 * 86400000) ||
            (visitFilter === "90_DAYS" &&
              lastVisitAge !== null &&
              lastVisitAge <= 90 * 86400000) ||
            (visitFilter === "365_DAYS" &&
              lastVisitAge !== null &&
              lastVisitAge <= 365 * 86400000);
          const matchesClinical =
            clinicalFilter === "ALL" ||
            (clinicalFilter === "ALLERGY" && Boolean(p.knownAllergies)) ||
            (clinicalFilter === "CHRONIC" && Boolean(p.chronicConditions)) ||
            (clinicalFilter === "MEDICATION" &&
              Boolean(p.currentMedication)) ||
            (clinicalFilter === "ALERT" && Boolean(p.medicalAlerts));
          const matchesRegion =
            regionFilter === "ALL" ||
            (regionFilter === "UNSPECIFIED" && !p.region) ||
            p.region === regionFilter;
          return (
            matchesSearch &&
            matchesProfile &&
            matchesStatus &&
            matchesFunding &&
            matchesVisit &&
            matchesClinical &&
            matchesRegion
          );
        })
        .sort((a, b) => {
          if (sort === "NAME_DESC") return b.fullName.localeCompare(a.fullName);
          if (sort === "CREATED_DESC")
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          if (sort === "CREATED_ASC")
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          if (sort === "VISITS_DESC")
            return b.visits - a.visits || a.fullName.localeCompare(b.fullName);
          return a.fullName.localeCompare(b.fullName);
        }),
    [
      patients,
      query,
      sort,
      profileFilter,
      statusFilter,
      fundingFilter,
      visitFilter,
      clinicalFilter,
      regionFilter,
    ],
  );
  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set(patients.map((patient) => patient.region).filter(Boolean)),
      )
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((region) => ({ value: String(region), label: String(region) })),
    [patients],
  );
  const hasFacetFilters = [
    profileFilter,
    statusFilter,
    fundingFilter,
    visitFilter,
    clinicalFilter,
    regionFilter,
  ].some((value) => value !== "ALL");
  useEffect(() => {
    // Refresh the optimistic client list after the server component supplies updated records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatients(initial);
  }, [initial]);
  useEffect(() => {
    const patient = initialEditId
      ? initial.find((item) => item.id === initialEditId)
      : null;
    if (patient) show(patient);
    // Opening a requested edit is intentionally keyed only by the route value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditId]);
  function show(patient?: Patient) {
    setEditing(patient || null);
    setGender(patient?.gender || "");
    setMethod(patient?.preferredMethod || "WHATSAPP");
    setFund(patient?.medicalAidId || "");
    setBirthDate(patient?.dateOfBirth?.slice(0, 10) || "");
    setIdentificationType(patient?.identificationType || "");
    setPatientStatus(patient?.status || "ACTIVE");
    setDirty(false);
    setDiscarding(false);
    setOpen(true);
  }
  function closeForm() {
    if (dirty) {
      setDiscarding(true);
      return;
    }
    setOpen(false);
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
          firstName: form.get("firstName"),
          middleName: form.get("middleName"),
          lastName: form.get("lastName"),
          identificationType,
          identityNumber: form.get("identityNumber"),
          passportNumber: form.get("passportNumber"),
          whatsapp: form.get("whatsapp"),
          address: form.get("address"),
          town: form.get("town"),
          region: form.get("region"),
          emergencyName: form.get("emergencyName"),
          emergencyRelation: form.get("emergencyRelation"),
          emergencyPhone: form.get("emergencyPhone"),
          knownAllergies: form.get("knownAllergies"),
          chronicConditions: form.get("chronicConditions"),
          currentMedication: form.get("currentMedication"),
          previousProcedures: form.get("previousProcedures"),
          medicalAlerts: form.get("medicalAlerts"),
          medicalHistorySummary: form.get("medicalHistorySummary"),
          status: patientStatus,
        }),
      });
      const data = await response.json();
      if (response.status === 409 && data.code === "POSSIBLE_MATCH") {
        toast.dismiss(toastId);
        setPossibleMatches(data.matches || []);
        setPendingCreate({
          id: editing?.id,
          fullName: form.get("fullName"),
          dateOfBirth: birthDate,
          gender,
          phone: form.get("phone"),
          email: form.get("email"),
          preferredMethod: method,
          medicalAidId: fund,
          membershipNumber: String(form.get("membershipNumber") || ""),
          firstName: form.get("firstName"),
          middleName: form.get("middleName"),
          lastName: form.get("lastName"),
          identificationType,
          identityNumber: form.get("identityNumber"),
          passportNumber: form.get("passportNumber"),
          whatsapp: form.get("whatsapp"),
          address: form.get("address"),
          town: form.get("town"),
          region: form.get("region"),
          emergencyName: form.get("emergencyName"),
          emergencyRelation: form.get("emergencyRelation"),
          emergencyPhone: form.get("emergencyPhone"),
          knownAllergies: form.get("knownAllergies"),
          chronicConditions: form.get("chronicConditions"),
          currentMedication: form.get("currentMedication"),
          previousProcedures: form.get("previousProcedures"),
          medicalAlerts: form.get("medicalAlerts"),
          medicalHistorySummary: form.get("medicalHistorySummary"),
          status: patientStatus,
        });
        setOpen(false);
        return;
      }
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
      setDirty(false);
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
  async function createSeparate() {
    if (!pendingCreate) return;
    setSaving(true);
    const toastId = toast.loading("Creating separate patient profile…");
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingCreate, forceSeparate: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Separate patient profile created", { id: toastId });
      setPossibleMatches([]);
      setPendingCreate(null);
      setDirty(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create patient",
        {
          id: toastId,
        },
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
      <div className="patient-toolbar" aria-label="Patient search and actions">
        <div className="search-box patient-search">
          <Search size={17} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, phone, aid or reference"
            aria-label="Search patients"
          />
        </div>
        <CustomSelect
          className="patient-sort"
          value={sort}
          onChange={setSort}
          options={patientSortOptions}
          ariaLabel="Sort patients"
        />
        <button
          className="btn btn-primary patient-add-button"
          onClick={() => show()}
        >
          <Plus size={17} /> Add patient
        </button>
      </div>
      <div className="patient-filter-facets" aria-label="Advanced patient filters">
        <CustomSelect
          value={profileFilter}
          onChange={setProfileFilter}
          options={[
            { value: "ALL", label: "Any profile" },
            { value: "COMPLETE", label: "Profile complete" },
            { value: "INCOMPLETE", label: "Profile incomplete" },
          ]}
          ariaLabel="Profile completeness"
        />
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "Any status" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "DECEASED", label: "Deceased" },
          ]}
          ariaLabel="Patient status"
        />
        <CustomSelect
          value={fundingFilter}
          onChange={setFundingFilter}
          options={[
            { value: "ALL", label: "Any funding" },
            { value: "PRIVATE", label: "Private" },
            { value: "MEDICAL_AID", label: "Any medical aid" },
            ...funds.map((item) => ({ value: item.id, label: item.name })),
          ]}
          ariaLabel="Funding type"
        />
        <CustomSelect
          value={visitFilter}
          onChange={setVisitFilter}
          options={[
            { value: "ALL", label: "Any visit date" },
            { value: "UPCOMING", label: "Upcoming booking" },
            { value: "30_DAYS", label: "Visited in 30 days" },
            { value: "90_DAYS", label: "Visited in 90 days" },
            { value: "365_DAYS", label: "Visited in 12 months" },
            { value: "NEVER", label: "No recorded visit" },
          ]}
          ariaLabel="Visit timing"
        />
        <CustomSelect
          value={clinicalFilter}
          onChange={setClinicalFilter}
          options={[
            { value: "ALL", label: "Any clinical flag" },
            { value: "ALLERGY", label: "Known allergy" },
            { value: "CHRONIC", label: "Chronic condition" },
            { value: "MEDICATION", label: "Current medication" },
            { value: "ALERT", label: "Important alert" },
          ]}
          ariaLabel="Clinical flag"
        />
        <CustomSelect
          value={regionFilter}
          onChange={setRegionFilter}
          options={[
            { value: "ALL", label: "Any region" },
            { value: "UNSPECIFIED", label: "Region missing" },
            ...regionOptions,
          ]}
          ariaLabel="Patient region"
        />
        {hasFacetFilters && (
          <button
            className="btn btn-light"
            type="button"
            onClick={() => {
              setProfileFilter("ALL");
              setStatusFilter("ALL");
              setFundingFilter("ALL");
              setVisitFilter("ALL");
              setClinicalFilter("ALL");
              setRegionFilter("ALL");
            }}
          >
            Clear filters
          </button>
        )}
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
                      <StatusBadge value="INCOMPLETE" />
                    )}
                  </td>
                  <td>{p.phone}</td>
                  <td>{p.medicalAid || "Private"}</td>
                  <td>{p.visits}</td>
                  <td>
                    <div className="table-actions">
                      {canManageSickNotes && (
                        <Link
                          className="icon-action"
                          href={`/dashboard/sick-notes/new?patient=${p.id}`}
                          aria-label={`Create sick note for ${p.fullName}`}
                          title="Create sick note"
                        >
                          <FileText size={16} />
                        </Link>
                      )}
                      <Link
                        className="icon-action"
                        href={`/dashboard/patients/${p.id}/medical-aid`}
                        aria-label={`Benefits profile for ${p.fullName}`}
                        title="Medical aid"
                      >
                        <CreditCard size={16} />
                      </Link>
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
        {!!visible.length && (
          <div className="record-card-list patient-card-list">
            {visible.map((p) => (
              <article className="record-card" key={p.id}>
                <span className="record-card-heading">
                  <b>{p.fullName}</b>
                  <small>{p.patientNumber}</small>
                </span>
                <span>{p.phone}</span>
                <small>
                  {p.dateOfBirth
                    ? new Date(p.dateOfBirth).toLocaleDateString("en-NA")
                    : "Missing date of birth for claims"}
                </small>
                <small>
                  {p.medicalAid || "Private"} · {p.visits} visit
                  {p.visits === 1 ? "" : "s"}
                </small>
                <span className="record-card-actions">
                  <Link
                    className="icon-action"
                    href={`/dashboard/patients/${p.id}/medical-aid`}
                    aria-label={`Benefits profile for ${p.fullName}`}
                    title="Medical aid"
                  >
                    <CreditCard size={16} />
                  </Link>
                  <button
                    className="icon-action"
                    type="button"
                    onClick={() => show(p)}
                    aria-label={`Edit ${p.fullName}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-action danger-action"
                    type="button"
                    disabled={deleting === p.id}
                    onClick={() => setPendingArchive(p)}
                    aria-label={`Archive ${p.fullName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </article>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close patient form"
            onClick={closeForm}
          />
          <form
            className="appointment-panel"
            onSubmit={submit}
            onChange={() => setDirty(true)}
          >
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
                onClick={closeForm}
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
                <label>First name</label>
                <input
                  className="input"
                  name="firstName"
                  defaultValue={editing?.firstName || ""}
                />
              </div>
              <div className="field">
                <label>Middle name</label>
                <input
                  className="input"
                  name="middleName"
                  defaultValue={editing?.middleName || ""}
                />
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  className="input"
                  name="lastName"
                  defaultValue={editing?.lastName || ""}
                />
              </div>
              <div className="field">
                <label>
                  Date of birth <span>(optional)</span>
                </label>
                <DatePicker
                  value={birthDate}
                  onChange={(value) => {
                    setBirthDate(value);
                    setDirty(true);
                  }}
                  ariaLabel="Date of birth"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="field">
                <label>Gender</label>
                <CustomSelect
                  ariaLabel="Gender"
                  value={gender}
                  onChange={(value) => {
                    setGender(value);
                    setDirty(true);
                  }}
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
                <label>WhatsApp</label>
                <input
                  className="input"
                  name="whatsapp"
                  defaultValue={editing?.whatsapp || editing?.phone || ""}
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
                  onChange={(value) => {
                    setMethod(value);
                    setDirty(true);
                  }}
                  options={communication}
                />
              </div>
              <div className="field">
                <label>Identification type</label>
                <CustomSelect
                  value={identificationType}
                  onChange={(value) => {
                    setIdentificationType(value);
                    setDirty(true);
                  }}
                  options={[
                    { value: "", label: "Not recorded" },
                    { value: "NAMIBIAN_ID", label: "Namibian ID" },
                    { value: "PASSPORT", label: "Passport" },
                    { value: "OTHER", label: "Other identification" },
                  ]}
                />
              </div>
              {identificationType === "PASSPORT" ? (
                <div className="field">
                  <label>Passport number</label>
                  <input
                    className="input"
                    name="passportNumber"
                    defaultValue={editing?.passportNumber || ""}
                  />
                </div>
              ) : identificationType ? (
                <div className="field">
                  <label>Identification number</label>
                  <input
                    className="input"
                    name="identityNumber"
                    defaultValue={editing?.identityNumber || ""}
                  />
                </div>
              ) : null}
              <div className="field">
                <label>Patient status</label>
                <CustomSelect
                  value={patientStatus}
                  onChange={(value) => {
                    setPatientStatus(value);
                    setDirty(true);
                  }}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                    { value: "DECEASED", label: "Deceased" },
                  ]}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Residential address</label>
                <input
                  className="input"
                  name="address"
                  defaultValue={editing?.address || ""}
                />
              </div>
              <div className="field">
                <label>Town or city</label>
                <input
                  className="input"
                  name="town"
                  defaultValue={editing?.town || ""}
                />
              </div>
              <div className="field">
                <label>Region</label>
                <input
                  className="input"
                  name="region"
                  defaultValue={editing?.region || ""}
                />
              </div>
              <div className="field">
                <label>Emergency contact name</label>
                <input
                  className="input"
                  name="emergencyName"
                  defaultValue={editing?.emergencyName || ""}
                />
              </div>
              <div className="field">
                <label>Relationship</label>
                <input
                  className="input"
                  name="emergencyRelation"
                  defaultValue={editing?.emergencyRelation || ""}
                />
              </div>
              <div className="field">
                <label>Emergency contact phone</label>
                <input
                  className="input"
                  name="emergencyPhone"
                  defaultValue={editing?.emergencyPhone || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Known allergies</label>
                <textarea
                  className="input"
                  name="knownAllergies"
                  defaultValue={editing?.knownAllergies || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Chronic conditions</label>
                <textarea
                  className="input"
                  name="chronicConditions"
                  defaultValue={editing?.chronicConditions || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Current medication</label>
                <textarea
                  className="input"
                  name="currentMedication"
                  defaultValue={editing?.currentMedication || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Previous procedures or operations</label>
                <textarea
                  className="input"
                  name="previousProcedures"
                  defaultValue={editing?.previousProcedures || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>Important medical alerts</label>
                <textarea
                  className="input"
                  name="medicalAlerts"
                  defaultValue={editing?.medicalAlerts || ""}
                />
              </div>
              <div className="field dashboard-span-all">
                <label>General medical-history summary</label>
                <textarea
                  className="input"
                  name="medicalHistorySummary"
                  defaultValue={editing?.medicalHistorySummary || ""}
                />
              </div>
              <div className="field">
                <label>Medical aid</label>
                <CustomSelect
                  ariaLabel="Medical aid"
                  value={fund}
                  onChange={(value) => {
                    setFund(value);
                    setDirty(true);
                  }}
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
                onClick={closeForm}
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
      {possibleMatches.length > 0 && pendingCreate && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Cancel patient matching"
            onClick={() => {
              setPossibleMatches([]);
              setPendingCreate(null);
            }}
          />
          <section className="appointment-panel">
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Possible duplicate</span>
                <h2>A patient with similar details already exists.</h2>
                <p>
                  Review masked details before creating a separate patient
                  profile.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setPossibleMatches([]);
                  setPendingCreate(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="record-stack">
              {possibleMatches.map((match) => (
                <article className="record-row" key={match.id}>
                  <div>
                    <b>{match.fullName}</b>
                    <small>
                      {match.dateOfBirth
                        ? new Date(match.dateOfBirth).toLocaleDateString(
                            "en-NA",
                          )
                        : "Date of birth not recorded"}{" "}
                      · {match.maskedId || "ID not recorded"} ·{" "}
                      {match.maskedPhone || "Phone not recorded"}
                    </small>
                    <small>
                      {match.lastVisit
                        ? `Last visit ${new Date(match.lastVisit).toLocaleDateString("en-NA")}`
                        : "No previous visit"}
                    </small>
                  </div>
                  <Link
                    className="btn btn-light"
                    href={`/dashboard/patients/${match.id}`}
                  >
                    Review patient
                  </Link>
                </article>
              ))}
            </div>
            <div className="appointment-panel-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setPossibleMatches([]);
                  setPendingCreate(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={createSeparate}
              >
                {saving && <Loader2 className="toast-spinner" size={16} />}{" "}
                Create separate patient
              </button>
            </div>
          </section>
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
      <ConfirmationDialog
        open={discarding}
        title="Discard patient changes?"
        description="Unsaved patient details will be lost."
        confirmLabel="Discard changes"
        danger
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          setDirty(false);
          setOpen(false);
        }}
      />
    </>
  );
}
