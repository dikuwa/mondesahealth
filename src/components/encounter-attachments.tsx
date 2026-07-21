"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date | string;
};

export function EncounterAttachments({
  encounterId,
  initial,
  readOnly,
}: {
  encounterId: string;
  initial: Attachment[];
  readOnly: boolean;
}) {
  const [attachments, setAttachments] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!file) return;
    setSaving(true);
    const toastId = toast.loading("Uploading protected clinical attachment…");
    try {
      const form = new FormData();
      form.set("encounterId", encounterId);
      form.set("file", file);
      const response = await fetch("/api/encounter-attachments", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAttachments((current) => [...current, data.attachment]);
      setFile(null);
      toast.success("Clinical attachment uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card dashboard-card">
      <div className="dashboard-section-heading">
        <div>
          <h2>Clinical attachments</h2>
          <p>Protected PDFs and images linked only to this encounter.</p>
        </div>
      </div>
      {attachments.length ? (
        <div className="record-stack">
          {attachments.map((attachment) => (
            <article className="record-row" key={attachment.id}>
              <div>
                <b>{attachment.filename}</b>
                <small>
                  {(attachment.fileSize / 1024).toFixed(0)} KB ·{" "}
                  {attachment.mimeType}
                </small>
              </div>
              <a
                className="btn btn-light"
                href={`/api/encounter-attachments?id=${attachment.id}`}
                target="_blank"
                rel="noreferrer"
              >
                View attachment
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-copy">No clinical attachments uploaded.</p>
      )}
      {!readOnly && (
        <div className="attachment-upload-row">
          <label className="custom-upload">
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <strong>{file?.name || "Choose PDF or image"}</strong>
            <small>PDF, JPEG or PNG · maximum 10 MB</small>
          </label>
          <button
            type="button"
            className="btn btn-light"
            disabled={!file || saving}
            onClick={upload}
          >
            {saving ? (
              <Loader2 className="toast-spinner" size={16} />
            ) : (
              <FileUp size={16} />
            )}
            Upload securely
          </button>
        </div>
      )}
    </section>
  );
}
