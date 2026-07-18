"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Eye, Loader2, Mail, MessageCircle, Plus, Share2, WalletCards, X } from "lucide-react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { money } from "@/lib/utils";
type Patient = { id: string; fullName: string };
type Invoice = {
  id: string;
  number: string;
  patient: string;
  total: number;
  paid: number;
  status: string;
  patientPhone: string;
  patientWhatsapp: string | null;
  patientEmail: string | null;
};
const paymentMethods = [
  "CASH",
  "CARD",
  "EFT",
  "MEDICAL_AID_PAYMENT",
  "EMPLOYER_PAYMENT",
  "OTHER",
].map((value) => ({ value, label: value.replaceAll("_", " ") }));
export function FinanceManager({
  patients,
  invoices,
}: {
  patients: Patient[];
  invoices: Invoice[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"invoice" | "payment" | null>(null);
  const [selected, setSelected] = useState("");
  const [responsibility, setResponsibility] = useState("PATIENT_FULL");
  const [payer, setPayer] = useState("PATIENT");
  const [method, setMethod] = useState("EFT");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [sharing, setSharing] = useState<Invoice | null>(null);
  const [shareCache, setShareCache] = useState<Record<string, { link: string; message: string }>>({});
  const [share, setShare] = useState<{ link: string; message: string } | null>(null);
  const invoice = invoices.find((item) => item.id === selected);
  async function createShare(item: Invoice) {
    setSharing(item);
    if (shareCache[item.id]) {
      setShare(shareCache[item.id]);
      return;
    }
    try { const response = await fetch(`/api/documents/${item.id}/share`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const payload={link:data.link,message:data.message}; setShareCache((current)=>({...current,[item.id]:payload})); setShare(payload); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not create secure share link"); setSharing(null); }
  }
  async function copyLink() { if (!share) return; await navigator.clipboard.writeText(share.link); toast.success("Secure link copied"); }
  async function copyMessage() { if (!share) return; await navigator.clipboard.writeText(share.message); toast.success("Message copied"); }
  function updateShareMessage(message: string) {
    if (!sharing || !share) return;
    const next = { ...share, message };
    setShare(next);
    setShareCache((current) => ({ ...current, [sharing.id]: next }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const toastId = toast.loading(
      mode === "invoice" ? "Creating invoice…" : "Recording payment…",
    );
    try {
      const rate = Number(form.get("amount"));
      const body =
        mode === "invoice"
          ? {
              patientId: selected,
              responsibility,
              patientResponsibility:
                responsibility === "MEDICAL_AID_FULL" ? 0 : rate,
              medicalAidResponsibility:
                responsibility === "MEDICAL_AID_FULL" ? rate : 0,
              lines: [
                {
                  description: form.get("description"),
                  tariffCode: "",
                  quantity: 1,
                  rate,
                  patientPortion:
                    responsibility === "MEDICAL_AID_FULL" ? 0 : rate,
                  medicalAidPortion:
                    responsibility === "MEDICAL_AID_FULL" ? rate : 0,
                },
              ],
            }
          : {
              invoiceId: selected,
              amount: rate,
              method,
              payer,
              notes: form.get("notes"),
            };
      const response = await fetch(
        mode === "invoice" ? "/api/invoices" : "/api/payments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(
        mode === "invoice" ? "Invoice created" : "Payment and receipt recorded",
        { id: toastId },
      );
      setMode(null);
      setSelected("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="manager-toolbar">
        <div>
          <h2>Invoices</h2>
          <p>
            Create invoices, record payments, and issue receipts from one
            ledger.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSelected(patients[0]?.id || "");
            setMode("invoice");
          }}
        >
          <Plus size={17} /> Create invoice
        </button>
      </div>
      <div className="card dashboard-card" style={{ padding: 20 }}>
        {invoices.length ? (
          <div className="table-scroll">
            <table className="data-table finance-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Total</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.number}</b>
                    </td>
                    <td>{item.patient}</td>
                    <td>{money(item.total)}</td>
                    <td>{money(Math.max(0, item.total - item.paid))}</td>
                    <td><span className="account-status">{item.status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</span></td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-light"
                          disabled={item.paid >= item.total}
                          onClick={() => {
                            setSelected(item.id);
                            setMode("payment");
                          }}
                        >
                          <WalletCards size={15} /> Record payment
                        </button>
                        <button className="btn btn-light" onClick={() => setViewing(item)}><Eye size={15} /> View</button>
                        <a
                          className="btn btn-light"
                          href={`/api/documents/${item.id}/pdf?download=1`}
                          download
                        >
                          <Download size={15} /> PDF
                        </a>
                        <button className="btn btn-light" onClick={() => createShare(item)}><Share2 size={15} /> Share</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <h3>No invoices yet</h3>
            <p>Create an invoice after a consultation.</p>
          </div>
        )}
      </div>
      {mode && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button
            className="appointment-modal-backdrop"
            aria-label="Close"
            onClick={() => setMode(null)}
          />
          <form className="appointment-panel" onSubmit={submit}>
            <div className="appointment-panel-heading">
              <div>
                <span className="eyebrow">Finance</span>
                <h2>
                  {mode === "invoice" ? "Create invoice" : "Record payment"}
                </h2>
                <p>
                  {mode === "payment" && invoice
                    ? `${invoice.number} · ${money(invoice.total - invoice.paid)} outstanding`
                    : "Create a single-line consultation invoice."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMode(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="appointment-form-grid">
              {mode === "invoice" && (
                <>
                  <div className="field dashboard-span-all">
                    <label>Patient</label>
                    <CustomSelect
                      value={selected}
                      onChange={setSelected}
                      options={patients.map((item) => ({
                        value: item.id,
                        label: item.fullName,
                      }))}
                    />
                  </div>
                  <div className="field">
                    <label>Responsibility</label>
                    <CustomSelect
                      value={responsibility}
                      onChange={setResponsibility}
                      options={[
                        { value: "PATIENT_FULL", label: "Patient" },
                        { value: "MEDICAL_AID_FULL", label: "Medical aid" },
                      ]}
                    />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <input
                      className="input"
                      name="description"
                      defaultValue="Consultation"
                      required
                    />
                  </div>
                </>
              )}
              {mode === "payment" && (
                <>
                  <div className="field">
                    <label>Payer</label>
                    <CustomSelect
                      value={payer}
                      onChange={setPayer}
                      options={[
                        { value: "PATIENT", label: "Patient" },
                        { value: "MEDICAL_AID", label: "Medical aid" },
                        { value: "EMPLOYER", label: "Employer" },
                        { value: "OTHER", label: "Other" },
                      ]}
                    />
                  </div>
                  <div className="field">
                    <label>Method</label>
                    <CustomSelect
                      value={method}
                      onChange={setMethod}
                      options={paymentMethods}
                    />
                  </div>
                  <div className="field dashboard-span-all">
                    <label>Note</label>
                    <input className="input" name="notes" />
                  </div>
                </>
              )}
              <div className="field">
                <label>Amount (NAD)</label>
                <input
                  className="input"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    mode === "payment" && invoice
                      ? Math.max(0, invoice.total - invoice.paid)
                      : undefined
                  }
                  required
                />
              </div>
            </div>
            <div className="appointment-panel-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setMode(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || !selected}
              >
                {saving && <Loader2 className="toast-spinner" size={17} />} Save
              </button>
            </div>
          </form>
        </div>
      )}
      {!!invoices.length && (
        <div className="record-card-list invoice-card-list">
          {invoices.map((item) => (
            <article className="record-card" key={item.id}>
              <span className="record-card-heading">
                <b>{item.number}</b>
                <small>{item.status.replaceAll("_", " ")}</small>
              </span>
              <span>{item.patient}</span>
              <small>Total {money(item.total)} · Outstanding {money(Math.max(0, item.total - item.paid))}</small>
              <span className="record-card-actions">
                <button className="icon-action" title="Record payment" aria-label={`Record payment for ${item.number}`} disabled={item.paid >= item.total} onClick={() => { setSelected(item.id); setMode("payment"); }}><WalletCards size={16}/></button>
                <button className="icon-action" title="View invoice" aria-label={`View ${item.number}`} onClick={() => setViewing(item)}><Eye size={16}/></button>
                <a className="icon-action" title="Download PDF" aria-label={`Download ${item.number}`} href={`/api/documents/${item.id}/pdf?download=1`} download><Download size={16}/></a>
                <button className="icon-action" title="Share invoice" aria-label={`Share ${item.number}`} onClick={() => createShare(item)}><Share2 size={16}/></button>
              </span>
            </article>
          ))}
        </div>
      )}
      {viewing && <div className="appointment-modal finance-preview-modal" role="dialog" aria-modal="true"><button className="appointment-modal-backdrop" aria-label="Close preview" onClick={() => setViewing(null)} /><div className="appointment-panel"><div className="appointment-panel-heading"><div><span className="eyebrow">Invoice preview</span><h2>{viewing.number}</h2></div><button type="button" aria-label="Close" onClick={() => setViewing(null)}><X size={20} /></button></div><iframe className="finance-preview-frame" title={`Preview ${viewing.number}`} src={`/api/documents/${viewing.id}/pdf`} /><div className="appointment-panel-actions"><button className="btn btn-light" onClick={() => setViewing(null)}>Close</button><a className="btn btn-light" href={`/api/documents/${viewing.id}/pdf?download=1`} download><Download size={15}/> Download PDF</a><button className="btn btn-primary" onClick={() => createShare(viewing)}><Share2 size={15}/> Share</button></div></div></div>}
      {sharing && <div className="appointment-modal" role="dialog" aria-modal="true"><button className="appointment-modal-backdrop" aria-label="Close share" onClick={() => { setSharing(null); setShare(null); }} /><div className="appointment-panel"><div className="appointment-panel-heading"><div><span className="eyebrow">Secure sharing</span><h2>Share {sharing.number}</h2><p>Review the message before opening a sharing option.</p></div><button type="button" aria-label="Close" onClick={() => { setSharing(null); setShare(null); }}><X size={20} /></button></div>{share ? <div className="appointment-form-grid"><div className="share-link-box dashboard-span-all"><b>Secure link</b><span>{share.link}</span></div><label className="field dashboard-span-all"><span>Message</span><textarea className="input share-message-preview" value={share.message} onChange={(event)=>updateShareMessage(event.target.value)} /></label><div className="share-actions dashboard-span-all"><a className="btn btn-primary" href={`https://wa.me/${(sharing.patientWhatsapp || sharing.patientPhone).replace(/\D/g, "")}?text=${encodeURIComponent(share.message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/> WhatsApp</a>{sharing.patientEmail && <a className="btn btn-light" href={`mailto:${encodeURIComponent(sharing.patientEmail)}?subject=${encodeURIComponent(`Invoice ${sharing.number} - Mondesa Health`)}&body=${encodeURIComponent(share.message)}`}><Mail size={15}/> Email</a>}<button className="btn btn-light" onClick={copyMessage}><Copy size={15} /> Copy message</button><button className="btn btn-light" onClick={copyLink}><Copy size={15} /> Copy link</button>{"share" in navigator && <button className="btn btn-light" onClick={() => navigator.share({ title: `Invoice ${sharing.number}`, text: share.message, url: share.link })}>More sharing options</button>}</div></div> : <div className="share-loading"><Loader2 className="toast-spinner" size={18} /> Creating secure link…</div>}</div></div>}
    </>
  );
}
