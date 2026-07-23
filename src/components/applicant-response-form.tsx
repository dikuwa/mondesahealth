"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { ApplicationDocumentUpload } from "@/components/application-document-upload";
import { documentCategoryLabel } from "@/lib/application-document-categories";

type Props = {
  token: string;
  reference: string;
  practiceName: string;
  message: string;
  deadline: string;
  requestedCategories: string[];
  replacementDocumentIds: string[];
  applicationId: string;
};

export function ApplicantResponseForm({
  token,
  reference,
  practiceName,
  message,
  deadline,
  requestedCategories,
  replacementDocumentIds,
  applicationId,
}: Props) {
  const [applicantMessage, setApplicantMessage] = useState("");
  const [documentCount, setDocumentCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const hasDeadline = Boolean(deadline);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Submitting your response…");

    // Create application if in draft (document upload needs valid applicationId)
    let appId = applicationId;

    try {
      // We use PUT for the response
      const formData = new FormData();
      formData.set("token", token);
      formData.set("applicantMessage", applicantMessage);

      const response = await fetch("/api/provider-applications/information-request", {
        method: "PUT",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Response submitted", { id: toastId });
      setDone(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit response",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="card public-form-card application-success" role="status">
        <span className="application-success-icon">
          <CheckCircle2 size={28} />
        </span>
        <div className="eyebrow">Response received</div>
        <h2>Thank you for responding</h2>
        <p>
          Your response has been received and the platform team will continue
          the review process.
        </p>
      </div>
    );
  }

  return (
    <form className="card public-form-card practice-application-form" onSubmit={submit}>
      <div className="practice-application-form-heading">
        <div>
          <span className="eyebrow">Response</span>
          <h2>Additional information requested</h2>
        </div>
      </div>

      {reference && (
        <div className="respond-reference">
          <span>Application reference: <strong>{reference}</strong></span>
        </div>
      )}

      <div className="card respond-message-card">
        <div className="respond-message-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Message from the platform team</span>
        </div>
        <p className="respond-message-body">{message}</p>
        {hasDeadline && (
          <p className="respond-deadline">
            Please respond by{" "}
            <strong>
              {new Date(deadline).toLocaleDateString("en-NA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        )}
      </div>

      <div className="form-grid">
        {requestedCategories.length > 0 && (
          <div className="field-span-2 respond-requested-categories">
            <span>Requested document types</span>
            <ul>
              {requestedCategories.map((cat) => (
                <li key={cat}>{documentCategoryLabel(cat)}</li>
              ))}
            </ul>
          </div>
        )}

        {replacementDocumentIds.length > 0 && (
          <div className="field-span-2 respond-replacement-note">
            Some uploaded documents need to be replaced. Upload new versions
            below.
          </div>
        )}

        <ApplicationDocumentUpload
          onFilesChange={setDocumentCount}
          key={`upload-${applicationId}`}
        />

        <label className="field field-span-2">
          <span>Your message (optional)</span>
          <textarea
            className="input"
            rows={4}
            value={applicantMessage}
            onChange={(event) => setApplicantMessage(event.target.value)}
            placeholder="Add any additional information the platform team should know…"
          />
        </label>
      </div>

      <div className="form-actions">
        <p>Your existing application details and original documents remain preserved.</p>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="toast-spinner" size={17} /> Submitting…
            </>
          ) : (
            <>
              <Send size={16} /> Submit response
            </>
          )}
        </button>
      </div>
    </form>
  );
}
