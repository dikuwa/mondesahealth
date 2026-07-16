"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
import type { PracticeContent } from "@/lib/public-site";

type Draft = {
  hero: { eyebrow: string; headline: string; description: string; bookingLabel: string; servicesLabel: string; trustPoints: string[] };
  about: { eyebrow: string; heading: string; lead: string; body: string; values: { title: string; text: string }[] };
  appointment: { eyebrow: string; heading: string; ctaLabel: string; steps: { number: string; title: string; text: string }[] };
  contact: { eyebrow: string; heading: string; phoneLabel: string; directionsLabel: string };
  closing: { eyebrow: string; heading: string; description: string; bookingLabel: string };
};

const clone = (value: PracticeContent): Draft => JSON.parse(JSON.stringify(value)) as Draft;

export function ContentManager({ initial }: { initial: PracticeContent }) {
  const [draft, setDraft] = useState(() => clone(initial));
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const set = (section: keyof Draft, field: string, value: string) => setDraft((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const setArray = (section: "hero", index: number, value: string) => setDraft((current) => ({ ...current, hero: { ...current.hero, trustPoints: current.hero.trustPoints.map((item, i) => i === index ? value : item) } }));
  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Website content saved");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save website content"); }
    finally { setSaving(false); }
  }
  function updateValue(index: number, field: "title" | "text", value: string) {
    setDraft((current) => ({ ...current, about: { ...current.about, values: current.about.values.map((item, i) => i === index ? { ...item, [field]: value } : item) } }));
  }
  function updateStep(index: number, field: "title" | "text", value: string) {
    setDraft((current) => ({ ...current, appointment: { ...current.appointment, steps: current.appointment.steps.map((item, i) => i === index ? { ...item, [field]: value } : item) } }));
  }
  return <div className="content-manager dashboard-form-sections">
    <p className="muted">Update the public homepage using labelled fields. Changes are published when you save.</p>
    <ContentSection title="Hero" description="The first message visitors see.">
      <Field label="Eyebrow" value={draft.hero.eyebrow} onChange={(value) => set("hero", "eyebrow", value)} />
      <Field label="Headline" value={draft.hero.headline} onChange={(value) => set("hero", "headline", value)} />
      <TextField label="Description" value={draft.hero.description} onChange={(value) => set("hero", "description", value)} />
      <Field label="Primary button label" value={draft.hero.bookingLabel} onChange={(value) => set("hero", "bookingLabel", value)} />
      <Field label="Secondary button label" value={draft.hero.servicesLabel} onChange={(value) => set("hero", "servicesLabel", value)} />
      {draft.hero.trustPoints.map((value, index) => <Field key={`trust-${index}`} label={`Trust point ${index + 1}`} value={value} onChange={(next) => setArray("hero", index, next)} />)}
    </ContentSection>
    <ContentSection title="About" description="The practice story and value points.">
      <Field label="Eyebrow" value={draft.about.eyebrow} onChange={(value) => set("about", "eyebrow", value)} />
      <Field label="Heading" value={draft.about.heading} onChange={(value) => set("about", "heading", value)} />
      <TextField label="Lead paragraph" value={draft.about.lead} onChange={(value) => set("about", "lead", value)} />
      <TextField label="Supporting paragraph" value={draft.about.body} onChange={(value) => set("about", "body", value)} />
      <div className="content-repeat-grid">{draft.about.values.map((item, index) => <div className="content-repeat-item" key={`value-${index}`}><b>Value point {index + 1}</b><Field label="Title" value={item.title} onChange={(value) => updateValue(index, "title", value)} /><Field label="Description" value={item.text} onChange={(value) => updateValue(index, "text", value)} /></div>)}</div>
    </ContentSection>
    <ContentSection title="Appointment" description="Explain how visitors book a GP appointment.">
      <Field label="Eyebrow" value={draft.appointment.eyebrow} onChange={(value) => set("appointment", "eyebrow", value)} />
      <Field label="Heading" value={draft.appointment.heading} onChange={(value) => set("appointment", "heading", value)} />
      <Field label="Button label" value={draft.appointment.ctaLabel} onChange={(value) => set("appointment", "ctaLabel", value)} />
      <div className="content-repeat-grid">{draft.appointment.steps.map((item, index) => <div className="content-repeat-item" key={`step-${index}`}><b>Step {item.number}</b><Field label="Title" value={item.title} onChange={(value) => updateStep(index, "title", value)} /><TextField label="Description" value={item.text} onChange={(value) => updateStep(index, "text", value)} /></div>)}</div>
    </ContentSection>
    <ContentSection title="Contact" description="Labels used beside the confirmed practice contact details.">
      <Field label="Eyebrow" value={draft.contact.eyebrow} onChange={(value) => set("contact", "eyebrow", value)} /><Field label="Heading" value={draft.contact.heading} onChange={(value) => set("contact", "heading", value)} /><Field label="Phone button label" value={draft.contact.phoneLabel} onChange={(value) => set("contact", "phoneLabel", value)} /><Field label="Directions button label" value={draft.contact.directionsLabel} onChange={(value) => set("contact", "directionsLabel", value)} />
    </ContentSection>
    <ContentSection title="Closing call to action" description="The final invitation on the homepage.">
      <Field label="Eyebrow" value={draft.closing.eyebrow} onChange={(value) => set("closing", "eyebrow", value)} /><Field label="Heading" value={draft.closing.heading} onChange={(value) => set("closing", "heading", value)} /><TextField label="Description" value={draft.closing.description} onChange={(value) => set("closing", "description", value)} /><Field label="Button label" value={draft.closing.bookingLabel} onChange={(value) => set("closing", "bookingLabel", value)} />
    </ContentSection>
    <div className="content-manager-actions"><button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={16} /> : <Save size={16} />}{saving ? "Saving…" : "Save website content"}</button></div>
  </div>;
}

function ContentSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="card dashboard-card content-section"><div className="settings-card-heading"><h2>{title}</h2><p className="muted">{description}</p></div><div className="content-fields">{children}</div></section>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><input className="input" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field content-wide"><span>{label}</span><textarea className="input" rows={3} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
