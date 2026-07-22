"use client";

import { useState } from "react";
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
    return <div className="card public-form-card application-success" role="status"><div className="eyebrow">Application received</div><h2>Thank you for applying</h2><p>The platform team will review the submitted registration details before any practice is activated or displayed publicly.</p></div>;
  }

  return (
    <form className="card public-form-card" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Practice name</span><input className="input" name="practiceName" autoComplete="organization" required /></label>
        <label className="field"><span>Practice type</span><input className="input" name="practiceType" placeholder="e.g. Physiotherapy" required /></label>
        <label className="field"><span>Owner name</span><input className="input" name="ownerName" autoComplete="name" required /></label>
        <label className="field"><span>Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Phone</span><input className="input" name="phone" type="tel" autoComplete="tel" /></label>
        <label className="field"><span>Registration number</span><input className="input" name="registrationNumber" /></label>
        <label className="field"><span>Town</span><input className="input" name="town" autoComplete="address-level2" /></label>
        <label className="field"><span>Region</span><input className="input" name="region" autoComplete="address-level1" /></label>
        <label className="field field-span-2"><span>Practice description</span><textarea className="input" name="description" rows={5} /></label>
      </div>
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? "Submitting…" : "Submit application"}</button></div>
    </form>
  );
}
