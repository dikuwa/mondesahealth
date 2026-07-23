"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { documentCategoryLabel } from "@/lib/application-document-categories";
import { DocumentPreviewModal } from "@/components/ui/document-actions";

type DocumentVersion = {
  id: string;
  version: number;
  originalFilename: string;
  mimeType: string;
  size: number;
  checksum: string;
  documentStatus: string;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  replacementReason: string | null;
  internalNote: string | null;
  reviewer: { id: string; name: string } | null;
};

type Document = {
  id: string;
  category: string;
  currentVersion: number;
  reviewStatus: string;
  createdAt: string;
  versions: DocumentVersion[];
};

type Props = {
  applicationId: string;
};

export function ApplicationDocumentReview({ applicationId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFor, setActionFor] = useState<{
    versionId: string;
    action: "VERIFY" | "REJECT" | "REQUEST_REPLACEMENT";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{
    versionId: string;
    filename: string;
  } | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/provider-applications/documents?applicationId=${encodeURIComponent(applicationId)}`,
      );
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch {
      toast.error("Could not load application documents");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function performAction() {
    if (!actionFor) return;
    setSaving(true);
    const toastId = toast.loading("Updating document…");
    try {
      const response = await fetch("/api/provider-applications/documents/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: actionFor.versionId,
          action: actionFor.action,
          rejectionReason:
            actionFor.action === "REJECT" ? actionReason : undefined,
          replacementReason:
            actionFor.action === "REQUEST_REPLACEMENT" ? actionReason : undefined,
          internalNote: actionNote || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }
      toast.success("Document updated", { id: toastId });
      setActionFor(null);
      setActionReason("");
      setActionNote("");
      fetchDocuments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update document",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  function previewUrl(versionId: string): string {
    return `/api/provider-applications/documents/${versionId}?serve=true`;
  }

  function downloadUrl(versionId: string): string {
    return `/api/provider-applications/documents/${versionId}?serve=true`;
  }

  function statusLabel(status: string): string {
    return status.replaceAll("_", " ").toLowerCase().replace(/^./, (l) => l.toUpperCase());
  }

  function statusClass(status: string): string {
    const map: Record<string, string> = {
      VERIFIED: "status-verified",
      REJECTED: "status-rejected",
      REPLACEMENT_REQUESTED: "status-replacement",
      UPLOADED: "status-uploaded",
      EXPIRED: "status-expired",
    };
    return map[status] || "";
  }

  if (loading) {
    return (
      <div className="checklist-loading">
        <Loader2 className="toast-spinner" size={18} />
        Loading documents…
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="document-review-empty">
        <FileText size={32} />
        <h4>No supporting documents</h4>
        <p>The applicant has not uploaded any documents yet.</p>
      </div>
    );
  }

  return (
    <div className="application-document-review">
      <div className="verification-checklist-header">
        <h4>Supporting documents ({documents.length})</h4>
        <small className="document-review-hint">
          Document previews show metadata. Files are stored securely and are not
          directly rendered in the browser. Download is available for review.
        </small>
      </div>

      {documents.map((doc) => {
        const latest = doc.versions[0];
        if (!latest) return null;

        return (
          <div key={doc.id} className={`document-review-card ${statusClass(doc.reviewStatus)}`}>
            <div className="document-review-header">
              <div className="document-review-category">
                <FileText size={16} />
                <strong>{documentCategoryLabel(doc.category)}</strong>
                <span className={`document-review-badge ${doc.reviewStatus.toLowerCase()}`}>
                  {statusLabel(doc.reviewStatus)}
                </span>
              </div>
              <div className="document-review-versions">
                <small>v{doc.currentVersion}</small>
              </div>
            </div>

            <div className="document-review-meta">
              <span>{latest.originalFilename}</span>
              <span>{(latest.size / 1024).toFixed(0)} KB</span>
              <span>{new Date(latest.uploadedAt).toLocaleDateString("en-NA")}</span>
              {latest.reviewer && <span>Reviewed by {latest.reviewer.name}</span>}
            </div>

            <div className="document-review-preview">
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() =>
                  setPreview({
                    versionId: latest.id,
                    filename: latest.originalFilename,
                  })
                }
              >
                <Eye size={14} /> Preview
              </button>
              {latest.mimeType === "application/pdf" && (
                <a
                  className="btn btn-light btn-sm"
                  href={downloadUrl(latest.id)}
                  download={latest.originalFilename}
                >
                  <Download size={14} /> Download
                </a>
              )}
            </div>

            {latest.documentStatus === "UPLOADED" && (
              <div className="document-review-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    setActionFor({
                      versionId: latest.id,
                      action: "VERIFY",
                    })
                  }
                  disabled={Boolean(actionFor)}
                >
                  <ThumbsUp size={14} /> Verify
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() =>
                    setActionFor({
                      versionId: latest.id,
                      action: "REQUEST_REPLACEMENT",
                    })
                  }
                  disabled={Boolean(actionFor)}
                >
                  Request replacement
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() =>
                    setActionFor({
                      versionId: latest.id,
                      action: "REJECT",
                    })
                  }
                  disabled={Boolean(actionFor)}
                >
                  <ThumbsDown size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Action dialog */}
      {actionFor && (
        <div className="confirmation-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close"
            onClick={() => {
              setActionFor(null);
              setActionReason("");
              setActionNote("");
            }}
          />
          <form
            className="confirmation-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (!saving) performAction();
            }}
          >
            <div className="confirmation-copy">
              <span className="eyebrow">Document review</span>
              <h2>
                {actionFor.action === "VERIFY"
                  ? "Verify document"
                  : actionFor.action === "REJECT"
                    ? "Reject document"
                    : "Request replacement"}
              </h2>
              <p>
                {actionFor.action === "VERIFY"
                  ? "Confirm that this document is accurate and acceptable."
                  : actionFor.action === "REJECT"
                    ? "Provide a reason for rejecting this document."
                    : "Explain what needs to be corrected or replaced."}
              </p>
            </div>
            <button
              className="confirmation-close"
              type="button"
              onClick={() => {
                setActionFor(null);
                setActionReason("");
                setActionNote("");
              }}
              aria-label="Close prompt"
            >
              <X size={19} />
            </button>
            {actionFor.action !== "VERIFY" && (
              <label className="field confirmation-prompt-field">
                <span>
                  {actionFor.action === "REJECT"
                    ? "Rejection reason *"
                    : "Replacement reason *"}
                </span>
                <textarea
                  className="input"
                  rows={3}
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Explain the issue for the applicant…"
                  required
                />
              </label>
            )}
            <label className="field confirmation-prompt-field">
              <span>Internal note</span>
              <textarea
                className="input"
                rows={2}
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder="Optional note for reviewers…"
              />
            </label>
            <div className="confirmation-actions">
              <button
                className="btn btn-light"
                type="button"
                onClick={() => {
                  setActionFor(null);
                  setActionReason("");
                  setActionNote("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={`btn ${actionFor.action === "VERIFY" ? "btn-primary" : "btn-light"}`}
                disabled={
                  saving ||
                  (actionFor.action !== "VERIFY" && !actionReason.trim())
                }
              >
                {saving && <Loader2 className="toast-spinner" size={17} />}
                {actionFor.action === "VERIFY"
                  ? "Confirm verification"
                  : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview modal */}
      <DocumentPreviewModal
        open={Boolean(preview)}
        eyebrow="Document preview"
        number={preview?.filename ?? ""}
        previewUrl={preview ? previewUrl(preview.versionId) : ""}
        downloadUrl={
          preview ? downloadUrl(preview.versionId) : undefined
        }
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
