"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
type Rule = {
  weekday: number;
  active: boolean;
  openTime: string;
  closeTime: string;
  durationMinutes: number;
};
type Block = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const timeOptions=Array.from({length:48},(_,i)=>{const value=`${String(Math.floor(i/2)).padStart(2,"0")}:${i%2?"30":"00"}`;return{value,label:value}});
export function AvailabilityManager({
  initialRules,
  blocks,
}: {
  initialRules: Rule[];
  blocks: Block[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [saving, setSaving] = useState(false);
  const[startDate,setStartDate]=useState(""),[startTime,setStartTime]=useState(""),[endDate,setEndDate]=useState(""),[endTime,setEndTime]=useState("");
  function edit(day: number, patch: Partial<Rule>) {
    setRules((current) =>
      current.map((rule) =>
        rule.weekday === day ? { ...rule, ...patch } : rule,
      ),
    );
  }
  async function action(url: string, options: RequestInit, message: string) {
    setSaving(true);
    const id = toast.loading(message);
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Availability updated", { id });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update availability",
        { id },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="dashboard-equal-columns">
      <form
        className="card dashboard-card dashboard-span-all"
        style={{ padding: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          action(
            "/api/availability",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rules }),
            },
            "Saving weekly hours…",
          );
        }}
      >
        <div className="manager-toolbar">
          <div>
            <h2>Weekly hours</h2>
            <p>
              Inactive days are excluded from both public and staff booking.
            </p>
          </div>
          <button className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="toast-spinner" size={17} />} Save
            hours
          </button>
        </div>
        <div className="availability-grid">
          {rules.map((rule) => (
            <div className="availability-row" key={rule.weekday}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(event) =>
                    edit(rule.weekday, { active: event.target.checked })
                  }
                />
                <span>{days[rule.weekday]}</span>
              </label>
              <input
                className="input"
                type="time"
                value={rule.openTime}
                disabled={!rule.active}
                onChange={(event) =>
                  edit(rule.weekday, { openTime: event.target.value })
                }
              />
              <input
                className="input"
                type="time"
                value={rule.closeTime}
                disabled={!rule.active}
                onChange={(event) =>
                  edit(rule.weekday, { closeTime: event.target.value })
                }
              />
              <input
                className="input"
                aria-label="Appointment duration in minutes"
                type="number"
                min="10"
                max="180"
                value={rule.durationMinutes}
                disabled={!rule.active}
                onChange={(event) =>
                  edit(rule.weekday, {
                    durationMinutes: Number(event.target.value),
                  })
                }
              />
            </div>
          ))}
        </div>
      </form>
      <form
        className="card dashboard-card"
        style={{ padding: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          action(
            "/api/availability",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                startAt: new Date(`${startDate}T${startTime}:00`).toISOString(),
                endAt: new Date(`${endDate}T${endTime}:00`).toISOString(),
                reason: form.get("reason"),
              }),
            },
            "Adding blocked time…",
          );
          event.currentTarget.reset();setStartDate("");setStartTime("");setEndDate("");setEndTime("");
        }}
      >
        <h2>Add blocked time</h2>
        <div className="field"><label>Starts on</label><DatePicker value={startDate} onChange={setStartDate} min={new Date().toISOString().slice(0,10)} ariaLabel="Block start date"/></div>
        <div className="field"><label>Start time</label><CustomSelect value={startTime} onChange={setStartTime} options={timeOptions}/></div>
        <div className="field"><label>Ends on</label><DatePicker value={endDate} onChange={setEndDate} min={startDate||new Date().toISOString().slice(0,10)} ariaLabel="Block end date"/></div>
        <div className="field"><label>End time</label><CustomSelect value={endTime} onChange={setEndTime} options={timeOptions}/></div>
        <div className="field">
          <label>Reason</label>
          <input className="input" name="reason" required />
        </div>
        <button className="btn btn-primary" disabled={saving||!startDate||!startTime||!endDate||!endTime}>
          <Plus size={17} /> Block time
        </button>
      </form>
      <div className="card dashboard-card" style={{ padding: 24 }}>
        <h2>Upcoming blocked time</h2>
        {blocks.length ? (
          blocks.map((block) => (
            <div className="blocked-row" key={block.id}>
              <div>
                <b>{block.reason}</b>
                <small>
                  {new Date(block.startAt).toLocaleString()} —{" "}
                  {new Date(block.endAt).toLocaleString()}
                </small>
              </div>
              <button
                className="icon-action"
                aria-label="Remove blocked time"
                onClick={() =>
                  action(
                    `/api/availability?id=${block.id}`,
                    { method: "DELETE" },
                    "Removing blocked time…",
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">No future blocked times configured.</p>
        )}
      </div>
    </div>
  );
}
