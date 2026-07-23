"use client";

import { useState, useRef } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { PracticeRegistrationFields } from "@/components/practice-registration-fields";
import {
  ApplicationDocumentUpload,
  type ApplicationDocumentUploadRef,
} from "@/components/application-document-upload";

const CONTACT_METHODS = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

export function ProviderApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState("");
  const [practiceType, setPracticeType] = useState("");
  const [isOperating, setIsOperating] = useState(true);
  const [preferredContactMethod, setPreferredContactMethod] = useState("EMAIL");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const docRef = useRef<ApplicationDocumentUploadRef>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!practiceType) {
      toast.error("Select the practice type.");
      return;
    }

    if (documentCount < 1) {
      toast.error("Upload at least one supporting document before submitting.");
      return;
    }

    if (!declarationAccepted) {
      toast.error("You must accept the declaration to submit.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting provider application…");
    const form = new FormData(formRef.current!);

    try {
      const payload = {
        ...Object.fromEntries(form),
        practiceType,
        isOperating,
        preferredContactMethod,
        declarationAccepted,
      };

      const response = await fetch("/api/provider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Upload queued documents now that we have the application ID
      if (docRef.current) {
        const uploaded = await docRef.current.uploadAll(data.id);
        if (uploaded < documentCount) {
          toast(
            `${uploaded} of ${documentCount} documents uploaded. You can add more on the success page.`,
            { icon: "⚠️" },
          );
        }
      }

      setReference(data.reference || "MH-APP-2026-000000");
      toast.success("Application submitted", { id: toastId });
      setDone(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit application",
        { id: toastId },
      );
    } finally {
      setSubmitting(false);
    }
  }

  // After submission, show success page
  if (done) {
    return (
      <div className="card public-form-card application-success" role="status">
        <span className="application-success-icon">
          <CheckCircle2 size={28} />
        </span>
        <div className="eyebrow">Application received</div>
        <h2>Thank you for applying</h2>
        {reference && (
          <p className="application-reference">
            Reference: <strong>{reference}</strong>
          </p>
        )}
        <p>
          The platform team will review the submitted details and supporting
          documents before any practice is activated or displayed publicly.
        </p>

        <div className="application-success-notes">
          <ShieldCheck size={16} />
          <span>
            Approval creates a private workspace — it does not automatically
            publish your practice or activate public bookings.
          </span>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="card public-form-card practice-application-form"
      onSubmit={submit}
    >
      <div className="practice-application-form-heading">
        <div>
          <span className="eyebrow">Practice details</span>
          <h2>Start your application</h2>
        </div>
        <small>
          <span aria-hidden="true">*</span> Required fields
        </small>
      </div>
      <p className="practice-application-form-intro">
        Share only the core identity, owner contact and location details needed
        for verification. Workspace configuration happens after approval.
      </p>

      <div className="form-grid">
        <PracticeRegistrationFields
          context="public"
          practiceType={practiceType}
          onPracticeTypeChange={setPracticeType}
        />

        <div className="field-span-2 registration-section-break">
          <span className="eyebrow">Operating details</span>
        </div>

        <label className="field">
          <span>
            Operating status <b className="required-marker" aria-hidden="true">*</b>
          </span>
          <select
            className="input native-select"
            value={isOperating ? "ALREADY_OPERATING" : "OPENING_SOON"}
            onChange={(e) => setIsOperating(e.target.value === "ALREADY_OPERATING")}
            aria-label="Operating status"
          >
            <option value="ALREADY_OPERATING">Already operating</option>
            <option value="OPENING_SOON">Opening soon</option>
          </select>
        </label>

        <label className="field">
          <span>
            Preferred contact method <b className="required-marker" aria-hidden="true">*</b>
          </span>
          <select
            className="input native-select"
            value={preferredContactMethod}
            onChange={(e) => setPreferredContactMethod(e.target.value)}
            aria-label="Preferred contact method"
          >
            {CONTACT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field-span-2 registration-section-break">
          <span className="eyebrow">Supporting documents</span>
          <p style={{ margin: "2px 0 0", color: "#5f746c", fontSize: "0.78rem", lineHeight: 1.45 }}>
            Upload at least one document to support your application.
          </p>
        </div>

        <div className="field-span-2">
          <ApplicationDocumentUpload
            ref={docRef}
            onFilesChange={setDocumentCount}
          />
        </div>

        <div className="field-span-2 application-privacy-notice">
          <ShieldCheck size={16} />
          <span>
            Your application is reviewed privately. Submission does not
            automatically publish your practice. Uploaded documents are used
            only for verification. More information may be requested during
            review.
          </span>
        </div>

        <label className="toggle-label field-span-2">
          <input
            type="checkbox"
            checked={declarationAccepted}
            onChange={(event) =>
              setDeclarationAccepted(event.target.checked)
            }
          />
          <span>
            I confirm that the information and supporting documents submitted
            are accurate and that I am authorised to apply on behalf of this
            practice. <b className="required-marker" aria-hidden="true">*</b>
          </span>
        </label>
      </div>

      <div className="form-actions">
        <p>
          By submitting, you confirm that these details are accurate. A
          reference number will be provided for tracking.
        </p>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="toast-spinner" size={17} />
              Submitting…
            </>
          ) : (
            <>
              Submit application <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
