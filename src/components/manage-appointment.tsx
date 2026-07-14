"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
export function ManageAppointment({
  token,
  status,
  hasStaffProposal,
}: {
  token: string;
  status: string;
  hasStaffProposal: boolean;
}) {
  const [reason, setReason] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [requesting, setRequesting] = useState(false),
    [loading, setLoading] = useState(false);
  const router = useRouter();
  async function loadDate(value: string) {
    setDate(value);
    setTime("");
    if (!value) return setSlots([]);
    const r = await fetch(`/api/slots?date=${value}`);
    const d = await r.json();
    setSlots(r.ok ? d.slots : []);
  }
  async function act(action: string) {
    setLoading(true);
    const id = toast.loading("Sending your request…");
    try {
      const r = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, reason, date, time }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(d.message, { id });
      setRequesting(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send your request",
        { id },
      );
    } finally {
      setLoading(false);
    }
  }
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(status))
    return (
      <p style={{ background: "#f7f4ed", padding: 18, borderRadius: 12 }}>
        This appointment is {status.toLowerCase().replaceAll("_", " ")} and can
        no longer be changed online.
      </p>
    );
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {hasStaffProposal && (
        <button
          className="btn btn-primary"
          onClick={() => act("ACCEPT_RESCHEDULE")}
          disabled={loading}
        >
          Accept proposed appointment
        </button>
      )}
      {requesting ? (
        <div className="card" style={{ padding: 18, display: "grid", gap: 13 }}>
          <div className="field">
            <label>Preferred date</label>
            <DatePicker
              value={date}
              onChange={loadDate}
              min={new Date().toISOString().slice(0, 10)}
              ariaLabel="Preferred date"
            />
          </div>
          <div className="field">
            <label>Available time</label>
            <CustomSelect
              value={time}
              onChange={setTime}
              options={slots.map((s) => ({ value: s, label: s }))}
              disabled={!date}
              placeholder={date ? "Choose a time" : "Choose a date first"}
            />
          </div>
          <div className="field">
            <label>
              Reason or message <span>(optional)</span>
            </label>
            <textarea
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={400}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-light"
              onClick={() => setRequesting(false)}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={() => act("REQUEST_CHANGE")}
              disabled={loading || !date || !time}
            >
              Request this time
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-light"
          onClick={() => setRequesting(true)}
          disabled={loading}
        >
          Request another date or time
        </button>
      )}
      <button
        style={{
          border: 0,
          background: "none",
          color: "#a43b32",
          padding: 12,
          cursor: "pointer",
          fontWeight: 700,
        }}
        onClick={() => act("CANCEL")}
        disabled={loading}
      >
        Cancel this appointment
      </button>
    </div>
  );
}
