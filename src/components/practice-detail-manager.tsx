"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";

type Practice = {
  id: string;
  name: string;
  type: string;
  ownerName: string | null;
  email: string | null;
  registrationNumber: string | null;
  licenceInformation: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  town: string | null;
  region: string | null;
  description: string | null;
  status: string;
  publicVisible: boolean;
  suspensionReason: string | null;
};

export function PracticeDetailManager({ practice }: { practice: Practice }) {
  const router = useRouter();
  const [status, setStatus] = useState(practice.status);
  const [publicVisible, setPublicVisible] = useState(practice.publicVisible);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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
          status,
          publicVisible,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Practice updated", { id: toastId });
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

  return (
    <form className="card dashboard-card content-card" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Practice name</span>
          <input className="input" name="name" defaultValue={practice.name} required />
        </label>
        <label className="field">
          <span>Practice type</span>
          <input className="input" name="type" defaultValue={practice.type} required />
        </label>
        <label className="field">
          <span>Owner name</span>
          <input className="input" name="ownerName" defaultValue={practice.ownerName || ""} required />
        </label>
        <label className="field">
          <span>Owner email</span>
          <input className="input" name="ownerEmail" type="email" defaultValue={practice.email || ""} required />
        </label>
        <label className="field">
          <span>Registration number</span>
          <input className="input" name="registrationNumber" defaultValue={practice.registrationNumber || ""} />
        </label>
        <label className="field">
          <span>Professional licence</span>
          <input className="input" name="licenceInformation" defaultValue={practice.licenceInformation || ""} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input className="input" name="phone" defaultValue={practice.phone || ""} />
        </label>
        <label className="field">
          <span>WhatsApp</span>
          <input className="input" name="whatsapp" defaultValue={practice.whatsapp || ""} />
        </label>
        <label className="field">
          <span>Address</span>
          <input className="input" name="address" defaultValue={practice.address || ""} />
        </label>
        <label className="field">
          <span>Town</span>
          <input className="input" name="town" defaultValue={practice.town || ""} />
        </label>
        <label className="field">
          <span>Region</span>
          <input className="input" name="region" defaultValue={practice.region || ""} />
        </label>
        <label className="field">
          <span>Status</span>
          <CustomSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              if (!["APPROVED", "ACTIVE"].includes(value))
                setPublicVisible(false);
            }}
            options={[
              "DRAFT",
              "SUBMITTED",
              "UNDER_REVIEW",
              "APPROVED",
              "ACTIVE",
              "PAYMENT_OVERDUE",
              "SUSPENDED",
              "REJECTED",
              "CLOSED",
            ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
        </label>
        <label className="field field-span-2">
          <span>Description</span>
          <textarea className="input" name="description" defaultValue={practice.description || ""} />
        </label>
        <label className="field field-span-2">
          <span>Suspension reason</span>
          <textarea className="input" name="suspensionReason" defaultValue={practice.suspensionReason || ""} />
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={publicVisible}
            disabled={!["APPROVED", "ACTIVE"].includes(status)}
            onChange={(event) => setPublicVisible(event.target.checked)}
          />
          <span>Visible in public marketplace</span>
        </label>
      </div>
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save practice"}
      </button></div>
    </form>
  );
}
