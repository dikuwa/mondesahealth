"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PromptDialog } from "@/components/ui/prompt-dialog";
export function PatientMergeAction({
  patientId,
  patientNumber,
}: {
  patientId: string;
  patientNumber: string;
}) {
  const router = useRouter(),
    [open, setOpen] = useState(false),
    [target, setTarget] = useState(""),
    [saving, setSaving] = useState(false);
  async function merge() {
    setSaving(true);
    const id = toast.loading("Merging patient records…");
    try {
      const response = await fetch("/api/patients/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: patientId,
            targetPatientNumber: target,
            confirmation: "MERGE",
          }),
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Patient records merged", { id });
      router.push(`/dashboard/patients/${data.targetId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not merge patients",
        { id },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button className="btn btn-light" onClick={() => setOpen(true)}>
        Merge duplicate
      </button>
      <PromptDialog
        open={open}
        title={`Merge duplicate ${patientNumber}`}
        description="Enter the exact target patient reference. All linked appointments, clinical records, documents, claims, and payments move to the target; this profile is archived. The action is audited and cannot be undone automatically."
        label="Target patient reference"
        value={target}
        onChange={setTarget}
        confirmLabel="Merge records"
        busy={saving}
        onCancel={() => setOpen(false)}
        onConfirm={merge}
      />
    </>
  );
}
