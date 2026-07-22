"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export function ProviderApplicationForm() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const id = toast.loading("Submitting provider application…");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/provider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
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
      <div className="form-grid">
        <label className="field"><span>Practice name <b aria-hidden="true">*</b></span><input className="input" name="practiceName" autoComplete="organization" placeholder="e.g. Coastal Family Practice" required /></label>
        <label className="field"><span>Practice type <b aria-hidden="true">*</b></span><input className="input" name="practiceType" placeholder="e.g. Physiotherapy" required /></label>
        <label className="field"><span>Owner name <b aria-hidden="true">*</b></span><input className="input" name="ownerName" autoComplete="name" placeholder="Full name" required /></label>
        <label className="field"><span>Email <b aria-hidden="true">*</b></span><input className="input" name="email" type="email" autoComplete="email" placeholder="you@practice.com" required /></label>
        <label className="field"><span>Phone</span><input className="input" name="phone" type="tel" autoComplete="tel" placeholder="e.g. +264 81 000 0000" /></label>
        <label className="field"><span>Registration number</span><input className="input" name="registrationNumber" placeholder="Professional or business number" /></label>
        <label className="field"><span>Town</span><input className="input" name="town" autoComplete="address-level2" placeholder="e.g. Swakopmund" /></label>
        <label className="field"><span>Region</span><input className="input" name="region" autoComplete="address-level1" placeholder="e.g. Erongo" /></label>
        <label className="field field-span-2"><span>Practice description</span><textarea className="input" name="description" rows={5} placeholder="Briefly describe your practice, services and the patients you support." /></label>
      </div>
      <div className="form-actions"><p>By submitting, you confirm that these details are accurate.</p><button className="btn btn-primary" disabled={saving}>{saving ? "Submitting…" : <>Submit application <ArrowRight size={17}/></>}</button></div>
    </form>
  );
}
