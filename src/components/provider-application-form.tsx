"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { PracticeRegistrationFields } from "@/components/practice-registration-fields";

export function ProviderApplicationForm() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [practiceType, setPracticeType] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practiceType) {
      toast.error("Select the practice type.");
      return;
    }
    setSaving(true);
    const id = toast.loading("Submitting provider application…");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/provider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), practiceType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Application submitted", { id });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit application", { id });
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return <div className="card public-form-card application-success" role="status"><span className="application-success-icon"><CheckCircle2 size={28}/></span><div className="eyebrow">Application received</div><h2>Thank you for applying</h2><p>The platform team will review the submitted registration details before any practice is activated or displayed publicly.</p></div>;
  }

  return (
    <form className="card public-form-card practice-application-form" onSubmit={submit}>
      <div className="practice-application-form-heading"><div><span className="eyebrow">Practice details</span><h2>Start your application</h2></div><small><span aria-hidden="true">*</span> Required fields</small></div>
      <p className="practice-application-form-intro">Share only the core identity, owner contact and location details needed for verification. Workspace configuration happens after approval.</p>
      <div className="form-grid">
        <PracticeRegistrationFields context="public" practiceType={practiceType} onPracticeTypeChange={setPracticeType} />
      </div>
      <div className="form-actions"><p>By submitting, you confirm that these details are accurate.</p><button className="btn btn-primary" disabled={saving}>{saving ? "Submitting…" : <>Submit application <ArrowRight size={17}/></>}</button></div>
    </form>
  );
}
