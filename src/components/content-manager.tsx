"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckCircle2, ChevronDown, Eye, Loader2, Save, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { PracticeContent } from "@/lib/public-site";

type Draft = {
  hero: { eyebrow: string; headline: string; description: string; bookingLabel: string; servicesLabel: string; trustPoints: string[] };
  about: { eyebrow: string; heading: string; lead: string; body: string; values: { title: string; text: string }[] };
  appointment: { eyebrow: string; heading: string; ctaLabel: string; steps: { number: string; title: string; text: string }[] };
  contact: { eyebrow: string; heading: string; phoneLabel: string; directionsLabel: string };
  closing: { eyebrow: string; heading: string; description: string; bookingLabel: string };
};

type Section = keyof Draft;

const clone = (value: PracticeContent): Draft => JSON.parse(JSON.stringify(value)) as Draft;
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

const sections: Array<{ id: Section; title: string; helper: string; summary: (draft: Draft) => string }> = [
  { id: "hero", title: "Hero", helper: "The first message visitors see.", summary: (draft) => draft.hero.headline },
  { id: "about", title: "About", helper: "The practice story and value points.", summary: (draft) => draft.about.heading },
  { id: "appointment", title: "Appointment", helper: "Explain how visitors book a GP appointment.", summary: (draft) => draft.appointment.heading },
  { id: "contact", title: "Contact", helper: "Labels used beside the confirmed practice contact details.", summary: (draft) => draft.contact.heading },
  { id: "closing", title: "Closing call to action", helper: "The final invitation on the homepage.", summary: (draft) => draft.closing.heading },
];

export function ContentManager({ initial }: { initial: PracticeContent }) {
  const [draft, setDraft] = useState(() => clone(initial));
  const [saved, setSaved] = useState(() => clone(initial));
  const [open, setOpen] = useState<Section>("hero");
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const router = useRouter();
  const dirty = !same(draft, saved);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const saveState = saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved";

  const completion = useMemo(() => {
    const has = (value: string | undefined) => Boolean(value?.trim());
    return {
      hero: has(draft.hero.headline) && has(draft.hero.description) && has(draft.hero.bookingLabel),
      about: has(draft.about.heading) && has(draft.about.lead),
      appointment: has(draft.appointment.heading) && has(draft.appointment.ctaLabel),
      contact: has(draft.contact.heading) && has(draft.contact.phoneLabel),
      closing: has(draft.closing.heading) && has(draft.closing.bookingLabel),
    } satisfies Record<Section, boolean>;
  }, [draft]);

  const set = (section: Section, field: string, value: string) =>
    setDraft((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const setTrust = (index: number, value: string) =>
    setDraft((current) => ({ ...current, hero: { ...current.hero, trustPoints: current.hero.trustPoints.map((item, i) => (i === index ? value : item)) } }));
  const updateValue = (index: number, field: "title" | "text", value: string) =>
    setDraft((current) => ({ ...current, about: { ...current.about, values: current.about.values.map((item, i) => (i === index ? { ...item, [field]: value } : item)) } }));
  const updateStep = (index: number, field: "title" | "text", value: string) =>
    setDraft((current) => ({ ...current, appointment: { ...current.appointment, steps: current.appointment.steps.map((item, i) => (i === index ? { ...item, [field]: value } : item)) } }));

  async function save() {
    setSaving(true);
    const id = toast.loading("Saving website content…");
    try {
      const response = await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSaved(clone(draft as unknown as PracticeContent));
      toast.success("Website content saved", { id });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save website content", { id });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (dirty) setConfirmDiscard(true);
  }

  function discardConfirmed() {
    setDraft(clone(saved as unknown as PracticeContent));
    setConfirmDiscard(false);
    toast.success("Unsaved website changes discarded");
  }

  function changeOpen(section: Section) {
    setOpen((current) => (current === section ? section : section));
  }

  return (
    <div className="content-manager approved-content-editor">
      <div className="approved-page-actions">
        <p className="muted">Update the public homepage using labelled fields. Changes are published when you save.</p>
        <div className="approved-action-stack">
          <Link className="btn btn-light" href="/" target="_blank" rel="noopener noreferrer">
            <Eye size={16} /> Preview website
          </Link>
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="toast-spinner" size={16} /> : <Save size={16} />} Save changes
          </button>
          <span className="approved-save-state"><CheckCircle2 size={15} /> {saveState}</span>
        </div>
      </div>

      {sections.map((section) => (
        <section className={`card dashboard-card content-accordion${open === section.id ? " is-open" : ""}`} key={section.id}>
          <button className="content-accordion-header" type="button" aria-expanded={open === section.id} onClick={() => changeOpen(section.id)}>
            <span className="content-accordion-title"><b>{section.title}</b><small>{section.helper}</small></span>
            <span className="content-accordion-status"><CheckCircle2 size={16} /> {completion[section.id] ? "Complete" : "Needs details"}</span>
            <span className="content-accordion-summary">{section.summary(draft)}</span>
            <ChevronDown size={18} />
          </button>
          {open === section.id && (
            <div className="content-fields">
              {section.id === "hero" && (
                <>
                  <Field label="Eyebrow" value={draft.hero.eyebrow} onChange={(value) => set("hero", "eyebrow", value)} />
                  <Field label="Headline" value={draft.hero.headline} max={100} onChange={(value) => set("hero", "headline", value)} />
                  <TextField label="Description" value={draft.hero.description} max={200} onChange={(value) => set("hero", "description", value)} />
                  <Field label="Primary button label" value={draft.hero.bookingLabel} onChange={(value) => set("hero", "bookingLabel", value)} />
                  <Field label="Secondary button label" value={draft.hero.servicesLabel} onChange={(value) => set("hero", "servicesLabel", value)} />
                  {draft.hero.trustPoints.map((value, index) => <Field key={`trust-${index}`} label={`Trust point ${index + 1}`} value={value} onChange={(next) => setTrust(index, next)} />)}
                </>
              )}
              {section.id === "about" && (
                <>
                  <Field label="Eyebrow" value={draft.about.eyebrow} onChange={(value) => set("about", "eyebrow", value)} />
                  <Field label="Heading" value={draft.about.heading} onChange={(value) => set("about", "heading", value)} />
                  <TextField label="Lead paragraph" value={draft.about.lead} onChange={(value) => set("about", "lead", value)} />
                  <TextField label="Supporting paragraph" value={draft.about.body} onChange={(value) => set("about", "body", value)} />
                  <div className="content-repeat-grid">{draft.about.values.map((item, index) => <div className="content-repeat-item" key={`value-${index}`}><b>Value point {index + 1}</b><Field label="Title" value={item.title} onChange={(value) => updateValue(index, "title", value)} /><Field label="Description" value={item.text} onChange={(value) => updateValue(index, "text", value)} /></div>)}</div>
                </>
              )}
              {section.id === "appointment" && (
                <>
                  <Field label="Eyebrow" value={draft.appointment.eyebrow} onChange={(value) => set("appointment", "eyebrow", value)} />
                  <Field label="Heading" value={draft.appointment.heading} onChange={(value) => set("appointment", "heading", value)} />
                  <Field label="Button label" value={draft.appointment.ctaLabel} onChange={(value) => set("appointment", "ctaLabel", value)} />
                  <div className="content-repeat-grid">{draft.appointment.steps.map((item, index) => <div className="content-repeat-item" key={`step-${index}`}><b>Step {item.number}</b><Field label="Title" value={item.title} onChange={(value) => updateStep(index, "title", value)} /><TextField label="Description" value={item.text} onChange={(value) => updateStep(index, "text", value)} /></div>)}</div>
                </>
              )}
              {section.id === "contact" && (
                <>
                  <Field label="Eyebrow" value={draft.contact.eyebrow} onChange={(value) => set("contact", "eyebrow", value)} />
                  <Field label="Heading" value={draft.contact.heading} onChange={(value) => set("contact", "heading", value)} />
                  <Field label="Phone button label" value={draft.contact.phoneLabel} onChange={(value) => set("contact", "phoneLabel", value)} />
                  <Field label="Directions button label" value={draft.contact.directionsLabel} onChange={(value) => set("contact", "directionsLabel", value)} />
                </>
              )}
              {section.id === "closing" && (
                <>
                  <Field label="Eyebrow" value={draft.closing.eyebrow} onChange={(value) => set("closing", "eyebrow", value)} />
                  <Field label="Heading" value={draft.closing.heading} onChange={(value) => set("closing", "heading", value)} />
                  <TextField label="Description" value={draft.closing.description} onChange={(value) => set("closing", "description", value)} />
                  <Field label="Button label" value={draft.closing.bookingLabel} onChange={(value) => set("closing", "bookingLabel", value)} />
                </>
              )}
            </div>
          )}
        </section>
      ))}

      <div className="form-action-bar content-sticky-actions">
        <button className="btn btn-light" type="button" disabled={!dirty || saving} onClick={discard}>
          <Trash2 size={16} /> Discard changes
        </button>
        <button className="btn btn-primary" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="toast-spinner" size={16} /> : <Save size={16} />} Save website content
        </button>
      </div>
      <ConfirmationDialog
        open={confirmDiscard}
        title="Discard website changes?"
        description="All unsaved homepage edits will be removed and the last saved content will be restored."
        confirmLabel="Discard changes"
        danger
        busy={false}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={discardConfirmed}
      />
    </div>
  );
}

function Field({ label, value, max, onChange }: { label: string; value: string; max?: number; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" value={value} maxLength={max} onChange={(event) => onChange(event.target.value)} />
      {max && <small className="field-count">{value.length} / {max}</small>}
    </label>
  );
}

function TextField({ label, value, max, onChange }: { label: string; value: string; max?: number; onChange: (value: string) => void }) {
  return (
    <label className="field content-wide">
      <span>{label}</span>
      <textarea className="input" rows={3} value={value} maxLength={max} onChange={(event) => onChange(event.target.value)} />
      {max && <small className="field-count">{value.length} / {max}</small>}
    </label>
  );
}
