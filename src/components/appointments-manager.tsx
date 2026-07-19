"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import {
  format,
  isAfter,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type Row = {
  id: string;
  reference: string;
  status: string;
  source: string;
  reason: string;
  startAt: string | null;
  preferredDate: string | null;
  patient: {
    id: string;
    fullName: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    incomplete: boolean;
    payment: string;
  };
  change: {
    id: string;
    initiatedBy: string;
    proposedStartAt: string;
    reason: string | null;
  } | null;
};
const quicks = ["ALL", "TODAY", "UPCOMING", "REQUESTS", "PAST"];
const statuses = [
  "ALL",
  "NEW_REQUEST",
  "CONFIRMED",
  "RESCHEDULE_PROPOSED",
  "RESCHEDULE_REQUESTED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];
const sources = ["ALL", "PUBLIC", "PHONE", "WALK_IN", "WHATSAPP", "STAFF"];
const sortOptions = [
  { value: "NEXT_ASC", label: "Next appointment first" },
  { value: "NEXT_DESC", label: "Latest appointment first" },
  { value: "PATIENT_ASC", label: "Patient A-Z" },
  { value: "STATUS_ASC", label: "Status A-Z" },
];
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export function AppointmentsManager({ rows }: { rows: Row[] }) {
  const router = useRouter(),
    params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || ""),
    [quick, setQuick] = useState(params.get("view") || "ALL"),
    [status, setStatus] = useState(params.get("status") || "ALL"),
    [source, setSource] = useState(params.get("source") || "ALL"),
    [sort, setSort] = useState(params.get("sort") || "NEXT_ASC"),
    [from, setFrom] = useState(params.get("from") || ""),
    [to, setTo] = useState(params.get("to") || ""),
    [selected, setSelected] = useState<Row | null>(null),
    [saving, setSaving] = useState(false),
    [rescheduling, setRescheduling] = useState(false),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [reason, setReason] = useState(""),
    [pendingCancel, setPendingCancel] = useState(false),
    [share, setShare] = useState<{
      message: string;
      link: string;
      whatsapp: string | null;
      email: string | null;
      patientId: string;
    } | null>(null);
  function sync(next: {
    q?: string;
    view?: string;
    status?: string;
    source?: string;
    sort?: string;
    from?: string;
    to?: string;
  }) {
    const p = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) =>
      value && value !== "ALL" ? p.set(key, value) : p.delete(key),
    );
    router.replace(`?${p.toString()}`, { scroll: false });
  }
  const visible = useMemo(
    () =>
      rows.filter((row) => {
        const hay =
          `${row.patient.fullName} ${row.patient.phone} ${row.reference} ${row.reason}`.toLowerCase();
        const when = row.startAt ? parseISO(row.startAt) : null;
        return (
          hay.includes(query.trim().toLowerCase()) &&
          (status === "ALL" || row.status === status) &&
          (source === "ALL" || row.source === source) &&
          (quick === "ALL" ||
            (quick === "TODAY" && !!when && isToday(when)) ||
            (quick === "UPCOMING" &&
              !!when &&
              isAfter(when, new Date()) &&
              !row.status.includes("CANCEL")) ||
            (quick === "REQUESTS" &&
              [
                "NEW_REQUEST",
                "RESCHEDULE_PROPOSED",
                "RESCHEDULE_REQUESTED",
              ].includes(row.status)) ||
            (quick === "PAST" &&
              !!when &&
              isBefore(when, startOfDay(new Date())))) &&
          (!from || (!!when && when >= parseISO(from))) &&
          (!to || (!!when && when < new Date(`${to}T23:59:59`)))
        );
      }).sort((a, b) => {
        if (sort === "PATIENT_ASC") return a.patient.fullName.localeCompare(b.patient.fullName);
        if (sort === "STATUS_ASC") return label(a.status).localeCompare(label(b.status));
        const aTime = a.startAt ? parseISO(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.startAt ? parseISO(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;
        return sort === "NEXT_DESC" ? bTime - aTime : aTime - bTime;
      }),
    [rows, query, status, source, quick, from, to, sort],
  );
  const openDetails = (row: Row) => {
    setSelected(row);
    setShare(null);
    setReason("");
    setRescheduling(false);
    setPendingCancel(false);
  };
  function clear() {
    setQuery("");
    setQuick("ALL");
    setStatus("ALL");
    setSource("ALL");
    setSort("NEXT_ASC");
    setFrom("");
    setTo("");
    router.replace("?", { scroll: false });
  }
  async function loadSlots(value: string) {
    setDate(value);
    setTime("");
    if (!value) return setSlots([]);
    const response = await fetch(`/api/slots?date=${value}`);
    const data = await response.json();
    setSlots(response.ok ? data.slots : []);
  }
  async function action(action: string, changeRequestId?: string) {
    if (!selected) return;
    setSaving(true);
    const toastId = toast.loading("Updating appointment…");
    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          date,
          time,
          reason,
          changeRequestId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.message, { id: toastId });
      if (
        ["CONFIRM", "CANCEL", "PROPOSE_RESCHEDULE", "APPROVE_CHANGE"].includes(
          action,
        )
      )
        await prepareShare(
          action === "CANCEL"
            ? "CANCELLATION"
            : action.includes("RESCHEDULE") || action === "APPROVE_CHANGE"
              ? "RESCHEDULE"
              : "CONFIRMATION",
        );
      setRescheduling(false);
      setPendingCancel(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update appointment",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }
  async function prepareShare(kind: string) {
    if (!selected) return;
    const response = await fetch("/api/appointments/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, kind }),
    });
    const data = await response.json();
    if (response.ok) setShare(data);
    else toast.error(data.error || "Could not prepare message");
  }
  async function copy(text: string, name: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${name} copied`);
  }
  return (
    <>
      <div className="card appointment-filters">
        <div className="search-box">
          <Search size={17} />
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              sync({ q: e.target.value });
            }}
            placeholder="Search patient, cellphone, reference or reason"
          />
        </div>
        <div className="appointment-quick-filters">
          {quicks.map((v) => (
            <button
              key={v}
              className={quick === v ? "is-active" : ""}
              onClick={() => {
                setQuick(v);
                sync({ view: v });
              }}
            >
              {label(v)}
            </button>
          ))}
        </div>
        <div className="appointment-filter-grid">
          <CustomSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              sync({ status: v });
            }}
            options={statuses.map((v) => ({
              value: v,
              label: v === "ALL" ? "All statuses" : label(v),
            }))}
          />
          <CustomSelect
            value={source}
            onChange={(v) => {
              setSource(v);
              sync({ source: v });
            }}
            options={sources.map((v) => ({
              value: v,
              label: v === "ALL" ? "All sources" : label(v),
            }))}
          />
          <DatePicker
            value={from}
            onChange={(v) => {
              setFrom(v);
              sync({ from: v });
            }}
            placeholder="From date"
            ariaLabel="From date"
          />
          <DatePicker
            value={to}
            onChange={(v) => {
              setTo(v);
              sync({ to: v });
            }}
            placeholder="To date"
            ariaLabel="To date"
          />
          <CustomSelect
            value={sort}
            onChange={(v) => {
              setSort(v);
              sync({ sort: v });
            }}
            options={sortOptions}
            ariaLabel="Sort appointments"
          />
        </div>
        <div className="appointment-filter-meta">
          <b>
            {visible.length} appointment{visible.length === 1 ? "" : "s"}
          </b>
          {(query ||
            quick !== "ALL" ||
            status !== "ALL" ||
            source !== "ALL" ||
            from ||
            to ||
            sort !== "NEXT_ASC") && (
            <button onClick={clear}>
              <X size={15} /> Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="card dashboard-card" style={{ padding: 20 }}>
        <div className="table-scroll">
          <table className="data-table appointments-table">
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Patient</th>
                <th>Source</th>
                <th>Status</th>
                <th>Reference</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="clickable-row"
                  tabIndex={0}
                  role="button"
                  onClick={() => openDetails(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(row);
                    }
                  }}
                >
                  <td>
                    {row.startAt
                      ? format(parseISO(row.startAt), "dd MMM yyyy · HH:mm")
                      : "Awaiting allocation"}
                  </td>
                  <td>
                    <b>{row.patient.fullName}</b>
                    <small className="appointment-reason-snippet" title={row.reason} style={{ display: "block" }}>
                      {row.patient.phone} · {row.reason}
                    </small>
                  </td>
                  <td>{label(row.source)}</td>
                  <td>
                    <StatusBadge value={row.status} />
                  </td>
                  <td>{row.reference}</td>
                  <td>
                    <button
                      className="icon-action"
                      aria-label={`Manage ${row.reference}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetails(row);
                      }}
                    >
                      <MoreHorizontal />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="dashboard-empty">
              <h3>No appointments found</h3>
              <p>Clear a filter or try another search.</p>
            </div>
          )}
        </div>
        {!!visible.length && (
          <div className="record-card-list appointments-card-list">
            {visible.map((row) => (
              <button className="record-card" type="button" key={row.id} onClick={() => openDetails(row)}>
                <span className="record-card-heading">
                  <b>{row.patient.fullName}</b>
                  <StatusBadge value={row.status} />
                </span>
                <span>{row.startAt ? format(parseISO(row.startAt), "dd MMM yyyy · HH:mm") : "Awaiting allocation"}</span>
                <small>{row.patient.phone} · {row.reference}</small>
                <small className="appointment-reason-snippet" title={row.reason}>{row.reason}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            onClick={() => setSelected(null)}
            aria-label="Close appointment details"
          />
          <div className="appointment-panel">
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">{selected.reference}</span>
                <h2>{selected.patient.fullName}</h2>
                <p>
                  {selected.startAt
                    ? format(
                        parseISO(selected.startAt),
                        "EEEE, dd MMMM yyyy 'at' HH:mm",
                      )
                    : "No time allocated"}{" "}
                  · {label(selected.source)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close appointment details">
                <X />
              </button>
            </div>
            <div className="appointment-form-grid">
              <div className="dashboard-span-all appointment-summary">
                <b>{selected.reason}</b>
                <span>
                  {selected.patient.phone} · {selected.patient.payment}
                </span>
                {selected.patient.incomplete && (
                  <Link href="/dashboard/patients">
                    Complete patient profile <ExternalLink size={14} />
                  </Link>
                )}
              </div>
              {selected.change && (
                <div className="dashboard-span-all change-request">
                  <b>
                    {selected.change.initiatedBy === "PATIENT"
                      ? "Patient requested"
                      : "Staff proposed"}{" "}
                    {format(
                      parseISO(selected.change.proposedStartAt),
                      "dd MMM yyyy 'at' HH:mm",
                    )}
                  </b>
                  <span>{selected.change.reason || "No reason supplied"}</span>
                  {selected.change.initiatedBy === "PATIENT" && (
                    <div>
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          action("APPROVE_CHANGE", selected.change!.id)
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-light"
                        onClick={() =>
                          action("DECLINE_CHANGE", selected.change!.id)
                        }
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}
              {rescheduling && (
                <>
                  <div className="field">
                    <label>New date</label>
                    <DatePicker
                      value={date}
                      onChange={loadSlots}
                      min={new Date().toISOString().slice(0, 10)}
                      ariaLabel="New appointment date"
                    />
                  </div>
                  <div className="field">
                    <label>New time</label>
                    <CustomSelect
                      value={time}
                      onChange={setTime}
                      options={slots.map((s) => ({ value: s, label: s }))}
                      disabled={!date}
                      placeholder="Choose a time"
                    />
                  </div>
                  <div className="field dashboard-span-all">
                    <label>Reason</label>
                    <textarea
                      className="input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary dashboard-span-all"
                    onClick={() => action("PROPOSE_RESCHEDULE")}
                    disabled={!date || !time || saving}
                  >
                    Send proposal
                  </button>
                </>
              )}
              {share && (
                <div className="dashboard-span-all communication-panel">
                  <h3>Share appointment update</h3>
                  <textarea
                    className="input"
                    value={share.message}
                    onChange={(e) =>
                      setShare({ ...share, message: e.target.value })
                    }
                  />
                  <div>
                    {share.whatsapp ? (
                      <a
                        className="btn btn-primary"
                        href={`${share.whatsapp.split("?text=")[0]}?text=${encodeURIComponent(share.message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={16} /> Open WhatsApp
                      </a>
                    ) : (
                      <Link
                        className="btn btn-light"
                        href="/dashboard/patients"
                      >
                        Add WhatsApp
                      </Link>
                    )}
                    {share.email ? (
                      <a
                        className="btn btn-light"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`${share.email.split("&body=")[0]}&body=${encodeURIComponent(share.message)}`}
                      >
                        <Mail size={16} /> Open email
                      </a>
                    ) : (
                      <Link
                        className="btn btn-light"
                        href="/dashboard/patients"
                      >
                        Add email
                      </Link>
                    )}
                    <button
                      className="btn btn-light"
                      onClick={() => copy(share.message, "Message")}
                    >
                      <Clipboard size={16} /> Copy message
                    </button>
                    <button
                      className="btn btn-light"
                      onClick={() => copy(share.link, "Secure link")}
                    >
                      <Clipboard size={16} /> Copy link
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!share && !rescheduling && (
              <div className="appointment-panel-actions appointment-action-wrap">
                {["NEW_REQUEST", "PENDING_CONFIRMATION"].includes(
                  selected.status,
                ) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => action("CONFIRM")}
                  >
                    <Check size={16} /> Confirm
                  </button>
                )}
                {[
                  "CONFIRMED",
                  "RESCHEDULE_PROPOSED",
                  "RESCHEDULE_REQUESTED",
                ].includes(selected.status) && (
                  <button
                    className="btn btn-light"
                    onClick={() => setRescheduling(true)}
                  >
                    Propose reschedule
                  </button>
                )}
                {selected.status === "CONFIRMED" && (
                  <>
                    <button
                      className="btn btn-light"
                      onClick={() => action("COMPLETE")}
                    >
                      Mark completed
                    </button>
                    <button
                      className="btn btn-light"
                      onClick={() => action("NO_SHOW")}
                    >
                      No-show
                    </button>
                  </>
                )}
                {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(
                  selected.status,
                ) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => setPendingCancel(true)}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="btn btn-light"
                  onClick={() =>
                    prepareShare(
                      selected.status === "CANCELLED"
                        ? "CANCELLATION"
                        : "CONFIRMATION",
                    )
                  }
                >
                  Prepare message
                </button>
              </div>
            )}
            {saving && (
              <div className="inline-loading" style={{ padding: 15 }}>
                <Loader2 className="toast-spinner" /> Saving…
              </div>
            )}
          </div>
          <ConfirmationDialog
            open={pendingCancel}
            title="Cancel this appointment?"
            description="The appointment will be marked cancelled and a patient message can be prepared after the update."
            confirmLabel="Cancel appointment"
            danger
            busy={saving}
            onCancel={() => setPendingCancel(false)}
            onConfirm={() => action("CANCEL")}
          />
        </div>
      )}
    </>
  );
}
