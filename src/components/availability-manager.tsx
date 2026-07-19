"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
  initialBookingMode,
  initialReminderEnabled,
  initialReminderLeadHours,
  initialRules,
  blocks,
}: {
  initialBookingMode: string;
  initialReminderEnabled: boolean;
  initialReminderLeadHours: number;
  initialRules: Rule[];
  blocks: Block[];
}) {
  const router = useRouter();
  const normalizedRules = useMemo(() => Array.from({ length: 7 }, (_, weekday) => initialRules.find((rule) => rule.weekday === weekday) ?? { weekday, active: weekday > 0 && weekday < 6, openTime: "08:00", closeTime: weekday === 5 ? "16:00" : "17:00", durationMinutes: 30 }), [initialRules]);
  const [rules, setRules] = useState(normalizedRules);
  const [bookingMode, setBookingMode] = useState(initialBookingMode);
  const [reminderEnabled,setReminderEnabled]=useState(initialReminderEnabled);
  const [reminderLeadHours,setReminderLeadHours]=useState(initialReminderLeadHours);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Block | null>(null);
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
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update availability",
        { id },
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  const invalidRule = rules.find((rule) => rule.active && rule.closeTime <= rule.openTime);
  const orderedRules = [1, 2, 3, 4, 5, 6, 0].map((weekday) => rules.find((rule) => rule.weekday === weekday)!).filter(Boolean);
  return (
    <div className="availability-workspace">
      <form
        className="card dashboard-card availability-booking-card"
        onSubmit={(event) => {
          event.preventDefault();
          action(
            "/api/settings",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingMode }),
            },
            "Saving booking mode…",
          );
        }}
      >
        <div className="manager-toolbar">
          <div>
            <h2>Public booking mode</h2>
            <p>Choose whether patients see live appointment times or submit a preferred-date request.</p>
          </div>
        </div>
        <div className="booking-mode-grid">
          {[
            ["AVAILABLE_TIME", "Show live available times", "Patients can view and book available times."],
            ["APPOINTMENT_REQUEST", "Accept appointment requests", "Patients can request a preferred date and time."],
          ].map(([value, label, text]) => (
            <label className={`booking-mode-option${bookingMode === value ? " is-selected" : ""}`} key={value}>
              <input type="radio" name="bookingMode" checked={bookingMode === value} onChange={() => setBookingMode(value)} />
              <span><b>{label}</b><small>{text}</small></span>
            </label>
          ))}
        </div>
        <div className="availability-card-actions"><button className="btn btn-primary" disabled={saving}>{saving && <Loader2 className="toast-spinner" size={17} />}Save booking mode</button></div>
      </form>

      <form className="card dashboard-card availability-booking-card" onSubmit={event=>{event.preventDefault();action("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({reminderEnabled,reminderLeadHours})},"Saving reminder settings…")}}>
        <div className="manager-toolbar"><div><h2>Appointment reminder queue</h2><p>Prepare reminders for staff to share manually. No WhatsApp or email is sent automatically.</p></div></div>
        <div className="appointment-form-grid"><label className="toggle-label"><input type="checkbox" checked={reminderEnabled} onChange={event=>setReminderEnabled(event.target.checked)}/><span>Enable reminder preparation</span></label><div className="field"><label>Lead time (hours)</label><input className="input" type="number" min="1" max="168" value={reminderLeadHours} onChange={event=>setReminderLeadHours(Number(event.target.value))} disabled={!reminderEnabled}/></div></div>
        <div className="availability-card-actions"><button className="btn btn-primary" disabled={saving}>Save reminder settings</button></div>
      </form>

      <form
        className="card dashboard-card dashboard-span-all"
        style={{ padding: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (invalidRule) {
            toast.error(`${days[invalidRule.weekday]} closing time must be after opening time.`);
            return;
          }
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
          <div className="availability-row availability-row-header" aria-hidden="true">
            <span>Day</span>
            <span>Opens</span>
            <span>Closes</span>
            <span>Slot duration</span>
          </div>
          {orderedRules.map((rule) => (
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
              <CustomSelect value={rule.openTime} onChange={(value) => edit(rule.weekday, { openTime: value })} options={timeOptions} disabled={!rule.active} ariaLabel={`${days[rule.weekday]} opening time`} />
              <CustomSelect value={rule.closeTime} onChange={(value) => edit(rule.weekday, { closeTime: value })} options={timeOptions} disabled={!rule.active} ariaLabel={`${days[rule.weekday]} closing time`} />
              <CustomSelect value={String(rule.durationMinutes)} onChange={(value) => edit(rule.weekday, { durationMinutes: Number(value) })} options={[20, 30, 40, 45, 60].map((value) => ({ value: String(value), label: `${value} min` }))} disabled={!rule.active} ariaLabel={`${days[rule.weekday]} slot duration`} />
            </div>
          ))}
        </div>
      </form>
      <div className="availability-block-grid">
        <form
          className="card dashboard-card availability-block-card"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const nextStart = new Date(`${startDate}T${startTime}:00`);
            const nextEnd = new Date(`${endDate}T${endTime}:00`);
            if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart) {
              toast.error("End time must be after start time.");
              return;
            }
            action(
              "/api/availability",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  startAt: nextStart.toISOString(),
                  endAt: nextEnd.toISOString(),
                  reason: form.get("reason"),
                }),
              },
              "Adding blocked time…",
            ).then((ok) => {
              if (ok) {
                event.currentTarget.reset();setStartDate("");setStartTime("");setEndDate("");setEndTime("");
              }
            });
          }}
        >
          <h2>Add blocked time</h2>
          <div className="availability-block-fields">
            <div className="field"><label>Starts on</label><DatePicker value={startDate} onChange={setStartDate} min={new Date().toISOString().slice(0,10)} ariaLabel="Block start date"/></div>
            <div className="field"><label>Start time</label><CustomSelect value={startTime} onChange={setStartTime} options={timeOptions} placeholder="Select"/></div>
            <div className="field"><label>Ends on</label><DatePicker value={endDate} onChange={setEndDate} min={startDate||new Date().toISOString().slice(0,10)} ariaLabel="Block end date"/></div>
            <div className="field"><label>End time</label><CustomSelect value={endTime} onChange={setEndTime} options={timeOptions} placeholder="Select"/></div>
            <div className="field availability-block-reason"><label>Reason</label><input className="input" name="reason" placeholder="Enter reason (optional)" /></div>
          </div>
          <button className="btn btn-primary" disabled={saving||!startDate||!startTime||!endDate||!endTime}>
            <Plus size={17} /> Block time
          </button>
        </form>
        <div className="card dashboard-card availability-block-card">
          <h2>Upcoming blocked time</h2>
          {blocks.length ? (
            blocks.map((block) => (
              <div className="blocked-row" key={block.id}>
                <div>
                  <b>{block.reason || "Blocked time"}</b>
                  <small>
                    {new Date(block.startAt).toLocaleString()} —{" "}
                    {new Date(block.endAt).toLocaleString()}
                  </small>
                </div>
                <button
                  className="icon-action"
                  aria-label="Remove blocked time"
                  onClick={() => setPendingDelete(block)}
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
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Remove blocked time?"
        description={pendingDelete ? `${pendingDelete.reason || "This blocked period"} will be removed from the booking calendar.` : ""}
        confirmLabel="Remove block"
        danger
        busy={saving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && action(
          `/api/availability?id=${pendingDelete.id}`,
          { method: "DELETE" },
          "Removing blocked time…",
        ).then((ok) => {
          if (ok) setPendingDelete(null);
        })}
      />
    </div>
  );
}
