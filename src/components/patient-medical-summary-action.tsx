"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";

const labels = {
  ALLERGY: {
    name: "Substance or allergen",
    secondary: "Severity",
    detail: "Reaction",
  },
  CONDITION: {
    name: "Condition",
    secondary: "ICD-10 code (optional)",
    detail: "Clinical detail",
  },
  MEDICATION: { name: "Medication", secondary: "Dose", detail: "Instructions" },
};

export function PatientMedicalSummaryAction({
  patientId,
}: {
  patientId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<keyof typeof labels>("ALLERGY");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Updating medical summary…");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/patient-medical-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, patientId, type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`${type.toLowerCase()} added`, { id: toastId });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the summary",
        {
          id: toastId,
        },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn btn-light" onClick={() => setOpen(true)}>
        <Plus size={16} /> Add medical summary item
      </button>
      {open && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close medical summary form"
            onClick={() => setOpen(false)}
          />
          <form className="appointment-panel" onSubmit={submit}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Clinical summary</span>
                <h2>Add allergy, condition or medication</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="appointment-form-grid">
              <div className="field dashboard-span-all">
                <label>Record type</label>
                <CustomSelect
                  value={type}
                  onChange={(value) => setType(value as keyof typeof labels)}
                  options={[
                    { value: "ALLERGY", label: "Allergy" },
                    { value: "CONDITION", label: "Condition" },
                    { value: "MEDICATION", label: "Medication" },
                  ]}
                />
              </div>
              <label className="field">
                <span>{labels[type].name}</span>
                <input className="input" name="name" required maxLength={200} />
              </label>
              <label className="field">
                <span>{labels[type].secondary}</span>
                <input className="input" name="secondary" maxLength={100} />
              </label>
              <label className="field dashboard-span-all">
                <span>{labels[type].detail}</span>
                <textarea className="input" name="detail" maxLength={500} />
              </label>
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
                {saving && <Loader2 className="toast-spinner" size={16} />} Save
                item
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
