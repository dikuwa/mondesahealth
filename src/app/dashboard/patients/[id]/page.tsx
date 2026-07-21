import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarPlus,
  ClipboardPlus,
  CreditCard,
  FileText,
  Pencil,
} from "lucide-react";
import { PageHeading } from "@/components/dashboard";
import { PatientMergeAction } from "@/components/patient-merge-action";
import { PatientMedicalSummaryAction } from "@/components/patient-medical-summary-action";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskIdentifier, missingPatientFields } from "@/lib/patient-matching";

const tabs = [
  "overview",
  "appointments",
  "clinical-history",
  "diagnoses",
  "medication",
  "allergies-conditions",
  "documents",
  "medical-aid-claims",
  "payments",
  "activity-log",
] as const;
const labels: Record<string, string> = {
  overview: "Overview",
  appointments: "Appointments",
  "clinical-history": "Clinical history",
  diagnoses: "Diagnoses",
  medication: "Medication",
  "allergies-conditions": "Allergies & conditions",
  documents: "Documents",
  "medical-aid-claims": "Medical aid & claims",
  payments: "Payments",
  "activity-log": "Activity log",
};
const age = (dob: Date | null) =>
  dob ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : null;

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (
    !session?.permissions.includes("MANAGE_PATIENTS") &&
    session?.role !== "OWNER"
  )
    notFound();
  const { id } = await params,
    requested = (await searchParams).tab || "overview",
    tab = tabs.includes(requested as never) ? requested : "overview";
  const patient = await db.patient.findFirst({
    where: { id, practiceId: session.practiceId, archivedAt: null },
    include: {
      memberships: { where: { current: true }, include: { medicalAid: true } },
      appointments: {
        where: { practiceId: session.practiceId },
        include: {
          service: true,
          encounters: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      encounters: {
        include: { clinician: { select: { name: true } }, diagnoses: true },
        orderBy: { startedAt: "desc" },
        take: 30,
      },
      allergies: { orderBy: { updatedAt: "desc" } },
      conditions: { orderBy: { updatedAt: "desc" } },
      medications: { orderBy: { updatedAt: "desc" } },
      sickNotes: {
        where: { practiceId: session.practiceId },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      invoices: {
        where: { practiceId: session.practiceId },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      payments: {
        where: { practiceId: session.practiceId },
        orderBy: { paidAt: "desc" },
        take: 20,
      },
      claims: {
        where: { practiceId: session.practiceId },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!patient) notFound();
  const missing = missingPatientFields(patient),
    now = new Date();
  const visits = patient.appointments.filter(
      (item) => item.status === "COMPLETED",
    ),
    upcoming = patient.appointments.filter(
      (item) =>
        item.startAt &&
        item.startAt >= now &&
        !["CANCELLED", "NO_SHOW"].includes(item.status),
    );
  const canClinical =
    session.role === "OWNER" ||
    session.permissions.includes("VIEW_CLINICAL_RECORDS");
  const timeline = [
    {
      at: patient.createdAt,
      type: "Patient created",
      text: `Patient profile ${patient.patientNumber} created`,
      href: null,
    },
    ...patient.appointments.map((item) => ({
      at: item.createdAt,
      type: "Booking",
      text: `${item.reference} · ${item.status.replaceAll("_", " ")}`,
      href: `/dashboard/appointments?appointment=${item.id}`,
    })),
    ...(canClinical
      ? patient.encounters.map((item) => ({
          at: item.startedAt,
          type: "Clinical encounter",
          text: `${item.status} · ${item.clinician.name}`,
          href: `/dashboard/encounters/${item.id}`,
        }))
      : []),
    ...patient.sickNotes.map((item) => ({
      at: item.createdAt,
      type: "Sick note",
      text: `${item.certificateNumber} · ${item.status}`,
      href: `/dashboard/sick-notes/${item.id}`,
    })),
    ...patient.invoices.map((item) => ({
      at: item.createdAt,
      type: "Invoice",
      text: `${item.number} · ${item.status}`,
      href: "/dashboard/finance",
    })),
    ...patient.payments.map((item) => ({
      at: item.paidAt,
      type: "Payment",
      text: `${item.reference} · N$${item.amount.toFixed(2)}`,
      href: "/dashboard/finance",
    })),
    ...patient.claims.map((item) => ({
      at: item.updatedAt,
      type: "Claim",
      text: `${item.claimNumber} · ${item.status}`,
      href: `/dashboard/claims/${item.id}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 50);
  const aid = patient.memberships[0];
  return (
    <>
      <PageHeading eyebrow="Patient medical record" title={patient.fullName} />
      <section className="card dashboard-card patient-record-header">
        <div>
          <p>
            {age(patient.dateOfBirth) ?? "Age not recorded"}
            {patient.dateOfBirth
              ? ` years · ${patient.dateOfBirth.toLocaleDateString("en-NA")}`
              : ""}{" "}
            · {patient.sex || patient.gender || "Sex not recorded"}
          </p>
          <small>
            {maskIdentifier(patient.identityNumber || patient.passportNumber) ||
              "Identification incomplete"}{" "}
            · {patient.phone} ·{" "}
            {aid?.medicalAid?.name || aid?.customFundName || "Private"}
          </small>
          {patient.medicalAlerts && (
            <p className="notice-warning">
              <AlertTriangle size={16} /> {patient.medicalAlerts}
            </p>
          )}
        </div>
        <div className="table-actions">
          <Link
            className="btn btn-light"
            href={`/dashboard/patients?edit=${patient.id}`}
          >
            <Pencil size={16} /> Edit patient
          </Link>
          <Link
            className="btn btn-light"
            href={`/dashboard/appointments?patient=${patient.id}`}
          >
            <CalendarPlus size={16} /> Add appointment
          </Link>
          {canClinical && (
            <PatientMedicalSummaryAction patientId={patient.id} />
          )}
          {canClinical && (
            <Link
              className="btn btn-primary"
              href={`/dashboard/encounters/new?patient=${patient.id}`}
            >
              <ClipboardPlus size={16} /> Start consultation
            </Link>
          )}
          <Link
            className="btn btn-light"
            href={`/dashboard/sick-notes/new?patient=${patient.id}`}
          >
            <FileText size={16} /> Create document
          </Link>
          <Link
            className="btn btn-light"
            href={`/dashboard/patients/${patient.id}/medical-aid`}
          >
            <CreditCard size={16} /> Medical aid
          </Link>
          {["OWNER", "ADMIN"].includes(session.role) && (
            <PatientMergeAction
              patientId={patient.id}
              patientNumber={patient.patientNumber}
            />
          )}
        </div>
      </section>
      <nav className="patient-tabs" aria-label="Patient record sections">
        {tabs.map((item) => (
          <Link
            key={item}
            className={tab === item ? "is-active" : ""}
            href={`/dashboard/patients/${patient.id}?tab=${item}`}
          >
            {labels[item]}
          </Link>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="patient-overview-grid">
          <Summary title="Personal information">
            <p>{patient.address || "Address not recorded"}</p>
            <small>
              {[patient.town, patient.region].filter(Boolean).join(", ") ||
                "Town and region not recorded"}
            </small>
          </Summary>
          <Summary title="Medical aid">
            <p>
              {aid?.medicalAid?.name ||
                aid?.customFundName ||
                "Private patient"}
            </p>
            <small>{aid?.membershipNumber || "No membership number"}</small>
          </Summary>
          <Summary title="Known allergies">
            <p>
              {patient.knownAllergies ||
                patient.allergies
                  .filter((x) => x.status === "ACTIVE")
                  .map((x) => x.substance)
                  .join(", ") ||
                "None recorded"}
            </p>
          </Summary>
          <Summary title="Chronic conditions">
            <p>
              {patient.chronicConditions ||
                patient.conditions
                  .filter((x) => x.status === "ACTIVE")
                  .map((x) => x.name)
                  .join(", ") ||
                "None recorded"}
            </p>
          </Summary>
          <Summary title="Current medication">
            <p>
              {patient.currentMedication ||
                patient.medications
                  .filter((x) => x.status === "ACTIVE")
                  .map((x) => x.name)
                  .join(", ") ||
                "None recorded"}
            </p>
          </Summary>
          <Summary title="Visit summary">
            <p>
              {visits.length} completed visit{visits.length === 1 ? "" : "s"}
            </p>
            <small>
              {upcoming[0]?.startAt
                ? `Next: ${upcoming[0].startAt.toLocaleString("en-NA")}`
                : "No upcoming appointment"}
            </small>
          </Summary>
          <Summary
            title="Missing profile information"
            warning={missing.length > 0}
          >
            <p>
              {missing.length
                ? missing.join(", ")
                : "Profile essentials complete"}
            </p>
          </Summary>
          <Summary
            title="Important alerts"
            warning={Boolean(patient.medicalAlerts)}
          >
            <p>{patient.medicalAlerts || "No important alerts recorded"}</p>
          </Summary>
        </div>
      )}
      {tab === "appointments" && (
        <RecordList
          empty="No appointments recorded."
          items={patient.appointments.map((x) => ({
            title: `${x.reference} · ${x.status.replaceAll("_", " ")}`,
            meta:
              x.startAt?.toLocaleString("en-NA") ||
              x.preferredDate?.toLocaleDateString("en-NA") ||
              "Date pending",
            href: `/dashboard/appointments?appointment=${x.id}`,
          }))}
        />
      )}
      {tab === "clinical-history" &&
        (canClinical ? (
          <RecordList
            empty="No clinical encounters recorded."
            items={patient.encounters.map((x) => ({
              title: `${x.status} · ${x.presentingComplaint || "Consultation"}`,
              meta: `${x.startedAt.toLocaleString("en-NA")} · ${x.clinician.name}`,
              href: `/dashboard/encounters/${x.id}`,
            }))}
          />
        ) : (
          <div className="dashboard-empty">
            Your role does not include access to clinical records.
          </div>
        ))}
      {tab === "diagnoses" && (
        <RecordList
          empty="No clinician-confirmed diagnoses recorded."
          items={patient.encounters
            .flatMap((x) => x.diagnoses)
            .map((x) => ({
              title: `${x.code ? `${x.code} · ` : ""}${x.description}`,
              meta: x.diagnosisType.replaceAll("_", " "),
            }))}
        />
      )}
      {tab === "medication" && (
        <RecordList
          empty="No medication recorded."
          items={patient.medications.map((x) => ({
            title: x.name,
            meta: [x.dose, x.frequency, x.status].filter(Boolean).join(" · "),
          }))}
        />
      )}
      {tab === "allergies-conditions" && (
        <RecordList
          empty="No allergies or conditions recorded."
          items={[
            ...patient.allergies.map((x) => ({
              title: `Allergy · ${x.substance}`,
              meta: [x.reaction, x.severity, x.status]
                .filter(Boolean)
                .join(" · "),
            })),
            ...patient.conditions.map((x) => ({
              title: `Condition · ${x.name}`,
              meta: [x.icd10Code, x.status].filter(Boolean).join(" · "),
            })),
          ]}
        />
      )}
      {tab === "documents" && (
        <RecordList
          empty="No recent documents recorded."
          items={patient.sickNotes.map((x) => ({
            title: x.certificateNumber,
            meta: x.status,
            href: `/dashboard/sick-notes/${x.id}`,
          }))}
        />
      )}
      {tab === "medical-aid-claims" && (
        <RecordList
          empty="No medical-aid claims recorded."
          items={patient.claims.map((x) => ({
            title: x.claimNumber,
            meta: x.status,
            href: `/dashboard/claims/${x.id}`,
          }))}
        />
      )}
      {tab === "payments" && (
        <RecordList
          empty="No payments recorded."
          items={patient.payments.map((x) => ({
            title: x.reference,
            meta: `N$${x.amount.toFixed(2)} · ${x.paidAt.toLocaleDateString("en-NA")}`,
          }))}
        />
      )}
      {tab === "activity-log" && (
        <RecordList
          empty="No timeline events recorded."
          items={timeline.map((x) => ({
            title: `${x.type} · ${x.text}`,
            meta: x.at.toLocaleString("en-NA"),
            href: x.href || undefined,
          }))}
        />
      )}
    </>
  );
}

function Summary({
  title,
  children,
  warning = false,
}: {
  title: string;
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <article
      className={`card dashboard-card${warning ? " summary-warning" : ""}`}
    >
      <h2>{title}</h2>
      {children}
    </article>
  );
}
function RecordList({
  items,
  empty,
}: {
  items: { title: string; meta?: string; href?: string }[];
  empty: string;
}) {
  return (
    <div className="card dashboard-card">
      <div className="record-stack">
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`} className="record-row">
            <div>
              <b>{item.title}</b>
              {item.meta && <small>{item.meta}</small>}
            </div>
            {item.href && (
              <Link className="btn btn-light" href={item.href}>
                Open
              </Link>
            )}
          </article>
        ))}
        {!items.length && <div className="dashboard-empty">{empty}</div>}
      </div>
    </div>
  );
}
