"use client";

import {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { APPLICATION_DOCUMENT_CATEGORIES } from "@/lib/application-document-categories";

type QueuedFile = {
  id: string;
  file: File;
  category: string;
  status: "QUEUED" | "UPLOADING" | "READY" | "FAILED";
  error?: string;
};

type Props = {
  disabled?: boolean;
  /** Called with the count of successfully-uploaded files. */
  onFilesChange: (count: number) => void;
};

export type ApplicationDocumentUploadRef = {
  /** Upload all queued files to the given application. Returns the count uploaded. */
  uploadAll: (applicationId: string) => Promise<number>;
  /** Number of files currently queued. */
  queuedCount: number;
};

export const ApplicationDocumentUpload = forwardRef<
  ApplicationDocumentUploadRef,
  Props
>(function ApplicationDocumentUpload({ disabled, onFilesChange }, ref) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track the ref value so uploadAll can read the latest
  const filesRef = useRef(files);
  filesRef.current = files;

  const updateCount = useCallback(
    (updated: QueuedFile[]) => {
      onFilesChange(updated.filter((f) => f.status === "READY").length);
    },
    [onFilesChange],
  );

  // Exposed method: upload all queued files after the application is created
  useImperativeHandle(
    ref,
    () => ({
      queuedCount: filesRef.current.filter(
        (f) => f.status === "QUEUED" || f.status === "READY",
      ).length,
      async uploadAll(applicationId: string) {
        let uploaded = 0;
        for (const entry of filesRef.current) {
          if (entry.status !== "QUEUED") continue;

          // Mark as uploading
          setFiles((current) =>
            current.map((f) =>
              f.id === entry.id ? { ...f, status: "UPLOADING" as const } : f,
            ),
          );

          const form = new FormData();
          form.set("applicationId", applicationId);
          form.set("category", entry.category);
          form.set("file", entry.file);

          try {
            const response = await fetch(
              "/api/provider-applications/documents",
              {
                method: "POST",
                body: form,
              },
            );
            if (!response.ok) {
              const err = await response.json();
              setFiles((current) =>
                current.map((f) =>
                  f.id === entry.id
                    ? { ...f, status: "FAILED" as const, error: err.error }
                    : f,
                ),
              );
              continue;
            }
            uploaded++;
            setFiles((current) =>
              current.map((f) =>
                f.id === entry.id
                  ? { ...f, status: "READY" as const }
                  : f,
              ),
            );
          } catch {
            setFiles((current) =>
              current.map((f) =>
                f.id === entry.id
                  ? { ...f, status: "FAILED" as const, error: "Network error" }
                  : f,
              ),
            );
          }
        }
        updateCount(filesRef.current);
        return uploaded;
      },
    }),
    [updateCount],
  );

  function queueFile(file: File, category: string) {
    if (filesRef.current.length >= 8) {
      toast.error("Maximum of 8 documents allowed.");
      return;
    }
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entry: QueuedFile = { id, file, category, status: "QUEUED" };
    setFiles((current) => {
      const updated = [...current, entry];
      updateCount(updated);
      return updated;
    });
  }

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles?.length) return;
    if (!newCategory) {
      toast.error("Select a document category first.");
      return;
    }
    for (const file of Array.from(selectedFiles)) {
      queueFile(file, newCategory);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const updated = current.filter((f) => f.id !== id);
      updateCount(updated);
      return updated;
    });
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!newCategory) {
      toast.error("Select a document category first.");
      return;
    }
    handleFiles(event.dataTransfer.files);
  }

  const queuedCount = files.filter(
    (f) => f.status === "QUEUED" || f.status === "READY",
  ).length;

  return (
    <fieldset className="field field-span-2 application-documents-section">
      <legend className="field-legend">
        <span>Supporting documents</span>
        <small>
          {queuedCount} of 8 · At least 1 required
        </small>
      </legend>

      <div className="application-document-notice">
        <AlertCircle size={15} />
        <span>
          Upload documents that help us verify your practice and professional
          registration. You do not need to provide every document now.
          Additional or updated documents may be requested during review.
        </span>
      </div>

      <div className="application-document-warning">
        <AlertCircle size={15} />
        <span>
          Do not upload identifiable patient records. Remove or cover patient
          names, identification numbers, dates of birth, diagnoses and other
          clinical details before uploading an existing medical certificate or
          practice document.
        </span>
      </div>

      <div className="application-document-category-row">
        <CustomSelect
          value={newCategory}
          onChange={setNewCategory}
          options={[
            { value: "", label: "Select document category", disabled: true },
            ...APPLICATION_DOCUMENT_CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
            })),
          ]}
          ariaLabel="Document category"
        />
      </div>

      <div
        className={`application-document-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload supporting documents"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) => handleFiles(event.target.files)}
          style={{ display: "none" }}
          disabled={disabled}
        />
        <Upload size={24} />
        <strong>Choose files or drag and drop here</strong>
        <small>PDF, JPG or PNG · Maximum 10 MB per file</small>
      </div>

      {files.length > 0 && (
        <div className="application-document-list">
          {files.map((entry) => (
            <div
              key={entry.id}
              className={`application-document-row status-${entry.status.toLowerCase()}`}
            >
              <div className="application-document-icon">
                {entry.status === "READY" ? (
                  <CheckCircle2 size={18} />
                ) : entry.status === "UPLOADING" ? (
                  <Loader2 className="toast-spinner" size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </div>
              <div className="application-document-info">
                <strong>{entry.file.name}</strong>
                <small>
                  {(entry.file.size / 1024).toFixed(0)} KB ·{" "}
                  {APPLICATION_DOCUMENT_CATEGORIES.find(
                    (c) => c.value === entry.category,
                  )?.label || entry.category}
                  {entry.status === "FAILED" && (
                    <span className="document-status-hint">
                      {" "}
                      · {entry.error || "Failed"}
                    </span>
                  )}
                </small>
              </div>
              {(entry.status === "QUEUED" || entry.status === "READY") && (
                <button
                  type="button"
                  className="icon-action"
                  onClick={() => removeFile(entry.id)}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
              {entry.status === "FAILED" && (
                <button
                  type="button"
                  className="icon-action"
                  onClick={() => removeFile(entry.id)}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
});

ApplicationDocumentUpload.displayName = "ApplicationDocumentUpload";
