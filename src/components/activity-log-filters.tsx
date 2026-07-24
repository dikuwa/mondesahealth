"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";

type User = { id: string; name: string };
type Action = { action: string };

export function ActivityLogFilters({
  defaultQ,
  defaultAction,
  defaultUserId,
  defaultFrom,
  defaultTo,
  actions,
  users,
  exportHref,
}: {
  defaultQ: string;
  defaultAction: string;
  defaultUserId: string;
  defaultFrom: string;
  defaultTo: string;
  actions: Action[];
  users: User[];
  exportHref: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [action, setAction] = useState(defaultAction);
  const [userId, setUserId] = useState(defaultUserId);

  function submit() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const params = new URLSearchParams();
    fd.forEach((value, key) => {
      if (typeof value === "string" && value) params.set(key, value);
    });
    // DatePicker values are controlled state, not form fields — add them manually
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (action) params.set("action", action);
    if (userId) params.set("userId", userId);
    router.push(`?${params}`);
  }

  const actionOptions = [
    { value: "", label: "All actions" },
    ...actions.map((item) => ({ value: item.action, label: item.action })),
  ];
  const userOptions = [
    { value: "", label: "All staff" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <form
      ref={formRef}
      className="card dashboard-card activity-filter-panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="search-box activity-search">
        <Search size={17} />
        <input
          className="input"
          name="q"
          placeholder="Search actor, action or summary"
          defaultValue={defaultQ}
        />
      </div>

      <label className="field">
        <span>Action</span>
        <CustomSelect
          value={action}
          onChange={setAction}
          options={actionOptions}
          placeholder="All actions"
        />
      </label>

      <label className="field">
        <span>Staff</span>
        <CustomSelect
          value={userId}
          onChange={setUserId}
          options={userOptions}
          placeholder="All staff"
        />
      </label>

      <label className="field">
        <span>From</span>
        <DatePicker value={from} onChange={setFrom} placeholder="DD/MM/YYYY" />
      </label>

      <label className="field">
        <span>To</span>
        <DatePicker value={to} onChange={setTo} placeholder="DD/MM/YYYY" />
      </label>

      <div className="activity-filter-actions">
        <button type="submit" className="btn btn-primary">
          Apply filters
        </button>
        <a className="btn btn-light" href={exportHref}>
          Export CSV
        </a>
      </div>
    </form>
  );
}
