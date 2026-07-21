"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

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
  logoData: string | null;
  description: string | null;
  status: string;
  publicVisible: boolean;
  suspensionReason: string | null;
};

export function PracticeDetailManager({ practice }: { practice: Practice }) {
  const router = useRouter();
  const [status, setStatus] = useState(practice.status);
  const [publicVisible, setPublicVisible] = useState(practice.publicVisible);
  const [logoData, setLogoData] = useState(practice.logoData);
  const [saving, setSaving] = useState(false);

  function selectLogo(file?: File) {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Choose a PNG, JPEG or WebP logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Choose a logo smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoData(String(reader.result));
    reader.readAsDataURL(file);
  }

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
          logoData,
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
    <form className="card dashboard-card" onSubmit={submit}>
      <section className="practice-logo-editor">
        <div className="practice-logo-preview">
          {logoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoData} alt={`${practice.name} logo preview`} />
          ) : (
            <span>{practice.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <h2>Practice logo</h2>
          <p>PNG, JPEG or WebP. Maximum 1 MB.</p>
          <div className="table-actions">
            <label className="btn btn-light">
              <Camera size={16} /> Choose logo
              <input
                className="visually-hidden"
                type="file"
                accept={LOGO_TYPES.join(",")}
                onChange={(event) => selectLogo(event.target.files?.[0])}
              />
            </label>
            {logoData && (
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setLogoData(null)}
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
          </div>
        </div>
      </section>
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
      <button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save practice"}
      </button>
    </form>
  );
}
