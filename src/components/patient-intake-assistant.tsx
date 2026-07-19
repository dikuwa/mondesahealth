"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle, Camera, Check, Loader2, MessageCircle, RotateCcw, Send, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import type { PublicEmergencyContact } from "@/lib/emergency";
import { INTAKE_CONSENT_VERSION } from "@/lib/intake-safety";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export type IntakeMessage = { role: "PATIENT" | "ASSISTANT"; content: string; skipped?: boolean };
export type IntakeImageDraft = { filename: string; mimeType: string; fileSize: number; data: string; preview: string };
export type IntakeDraft = {
  messages: IntakeMessage[];
  approvedSummary: string;
  structured: Record<string, unknown>;
  unansweredQuestions: string[];
  redFlags: string[];
  emergencyNoticeShown: boolean;
  emergencyNoticeAcknowledged: boolean;
  aiConsent: boolean;
  imageConsent: boolean;
  consentVersion: string;
  aiProvider: string;
  aiModel: string;
  summaryGeneratedAt: string | null;
  patientApprovedAt: string | null;
  images: IntakeImageDraft[];
};

export const emptyIntake: IntakeDraft = { messages: [], approvedSummary: "", structured: {}, unansweredQuestions: [], redFlags: [], emergencyNoticeShown: false, emergencyNoticeAcknowledged: false, aiConsent: false, imageConsent: false, consentVersion: INTAKE_CONSENT_VERSION, aiProvider: "", aiModel: "", summaryGeneratedAt: null, patientApprovedAt: null, images: [] };

async function privateImage(file: File): Promise<IntakeImageDraft> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB before processing.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The image could not be prepared.")), "image/jpeg", 0.9));
  if (blob.size > 4 * 1024 * 1024) throw new Error("The prepared image is still larger than 4 MB.");
  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("The image could not be read.")); reader.readAsDataURL(blob); });
  return { filename: file.name.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg", fileSize: blob.size, data, preview: URL.createObjectURL(blob) };
}

export function PatientIntakeAssistant({ reason, serviceId, providerId, aiAvailable, imagesAvailable, emergencyContacts, value, onChange }: { reason: string; serviceId: string; providerId: string; aiAvailable: boolean; imagesAvailable: boolean; emergencyContacts: PublicEmergencyContact[]; value: IntakeDraft; onChange: (value: IntakeDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [consentStep, setConsentStep] = useState(false);
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState(value.approvedSummary);
  const [summaryReady, setSummaryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRestart, setPendingRestart] = useState(false);
  const primary = emergencyContacts[0] ?? null;

  function begin() {
    if (!aiAvailable) return toast.error("AI assistance is not available for this service. You can continue booking normally.");
    if (!value.aiConsent) { setConsentStep(true); setOpen(true); return; }
    setOpen(true);
  }

  async function call(action: "NEXT" | "SUMMARISE", nextMessages = value.messages) {
    setLoading(true);
    try {
      const response = await fetch("/api/intake/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason, messages: nextMessages, serviceId: serviceId || null, providerId: providerId || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.redFlags?.length) {
        onChange({ ...value, messages: nextMessages, redFlags: data.redFlags, emergencyNoticeShown: true });
        setQuestion("");
        return;
      }
      if (action === "NEXT") {
        const assistantMessage: IntakeMessage[] = data.nextQuestion ? [{ role: "ASSISTANT", content: data.nextQuestion }] : [];
        onChange({ ...value, messages: [...nextMessages, ...assistantMessage], aiProvider: data.provider || "", aiModel: data.model || "" });
        setQuestion(data.nextQuestion || "You can finish and prepare the summary now.");
      } else {
        setSummary(data.summary);
        setSummaryReady(true);
        onChange({ ...value, messages: nextMessages, structured: data.fields || {}, unansweredQuestions: data.unansweredQuestions || [], aiProvider: data.provider || "", aiModel: data.model || "", summaryGeneratedAt: new Date().toISOString() });
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "AI assistance is unavailable. You can continue booking normally."); }
    finally { setLoading(false); }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const messages = [...value.messages, { role: "PATIENT" as const, content: input.trim() }];
    setInput("");
    onChange({ ...value, messages });
    await call("NEXT", messages);
  }

  async function skip() {
    const messages = [...value.messages, { role: "PATIENT" as const, content: question || "Question skipped", skipped: true }];
    onChange({ ...value, messages });
    await call("NEXT", messages);
  }

  function approveSummary() {
    onChange({ ...value, approvedSummary: summary.trim(), patientApprovedAt: new Date().toISOString() });
    setSummaryReady(false);
    setOpen(false);
    toast.success("AI-organised summary added for the doctor");
  }

  function restart() {
    onChange({ ...emptyIntake, aiConsent: value.aiConsent, imageConsent: value.imageConsent, images: value.images });
    setQuestion(""); setSummary(""); setSummaryReady(false); setInput("");
    setPendingRestart(false);
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    if (!value.imageConsent) return toast.error("Please provide photo consent before adding a photo.");
    if (value.images.length + files.length > 3) return toast.error("You can add up to three photos.");
    setLoading(true);
    try { const prepared = await Promise.all([...files].map(privateImage)); onChange({ ...value, images: [...value.images, ...prepared] }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The photo could not be prepared."); }
    finally { setLoading(false); }
  }

  return <div className="patient-intake-tools">
    <button className="btn btn-light patient-ai-trigger" type="button" onClick={begin} disabled={!reason.trim()}><MessageCircle size={16}/> Help me explain with AI</button>
    {value.redFlags.length > 0 && !open && <div className="patient-emergency-notice" role="alert"><AlertTriangle size={20}/><div><b>Urgent safety notice</b><p>{primary ? `Your description may require urgent medical attention. Do not wait for an online appointment. Call ${primary.label} on ${primary.phone} or go to the nearest emergency facility.` : "Your description may require urgent medical attention. Do not wait for an online appointment. Contact your nearest emergency service or go to the nearest emergency facility."}</p><p>Online booking is not an emergency service.</p>{primary && <a className="btn btn-danger" href={`tel:${primary.phone}`}>Call {primary.phone}</a>}<label className="booking-choice"><input type="checkbox" checked={value.emergencyNoticeAcknowledged} onChange={(event) => onChange({ ...value, emergencyNoticeAcknowledged: event.target.checked })}/><span>I have read and understand this urgent notice.</span></label></div></div>}
    {value.approvedSummary && <div className="patient-summary-approved"><span>AI-organised summary · Patient approved</span><p>{value.approvedSummary}</p><button type="button" onClick={() => { setSummary(value.approvedSummary); setSummaryReady(true); setOpen(true); }}>Edit summary</button><button type="button" onClick={() => onChange({ ...value, approvedSummary: "", patientApprovedAt: null })}>Discard AI summary</button></div>}
    {imagesAvailable && <div className="patient-photo-tool"><label className="booking-choice"><input type="checkbox" checked={value.imageConsent} onChange={(event) => onChange({ ...value, imageConsent: event.target.checked })}/><span>Photos are optional and will be shared securely with the practice. A photo cannot confirm a diagnosis.</span></label><label className="btn btn-light patient-photo-button"><Camera size={16}/> Add a photo for the doctor<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={(event) => addImages(event.target.files)}/></label></div>}
    {!!value.images.length && <div className="patient-image-previews">{value.images.map((image, index) => <figure key={`${image.filename}-${index}`}><Image src={image.preview} alt={`Selected symptom photo ${index + 1}`} width={120} height={90} unoptimized/><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => { URL.revokeObjectURL(image.preview); onChange({ ...value, images: value.images.filter((_, itemIndex) => itemIndex !== index) }); }}><Trash2 size={15}/></button></figure>)}</div>}
    {open && <div className="patient-ai-panel" aria-label="AI-assisted symptom intake">
      <div className="patient-ai-heading"><div><b>AI-assisted symptom intake</b><small>Patient-reported information · Not a diagnosis</small></div><button type="button" aria-label="Close AI assistant" onClick={() => setOpen(false)}><X size={18}/></button></div>
      {consentStep && !value.aiConsent ? <div className="patient-ai-consent"><p>AI will organise information you supply and share it with the selected practice provider as part of this booking. It does not provide a confirmed diagnosis; the clinician makes all final decisions. You may continue without AI.</p><label className="booking-choice"><input type="checkbox" checked={value.aiConsent} onChange={(event) => onChange({ ...value, aiConsent: event.target.checked, consentVersion: INTAKE_CONSENT_VERSION })}/><span>I consent to optional AI-assisted symptom intake.</span></label><button className="btn btn-primary" type="button" disabled={!value.aiConsent} onClick={() => { setConsentStep(false); setQuestion("I can help organise your symptoms for the doctor. I cannot diagnose you or replace medical care. Tell me what is troubling you in your own words."); }}>Begin</button></div> : <>
        {value.redFlags.length > 0 ? <div className="patient-emergency-notice" role="alert"><AlertTriangle size={20}/><div><b>Urgent safety notice</b><p>{primary ? `Your description may require urgent medical attention. Do not wait for an online appointment. Call ${primary.label} on ${primary.phone} or go to the nearest emergency facility.` : "Your description may require urgent medical attention. Do not wait for an online appointment. Contact your nearest emergency service or go to the nearest emergency facility."}</p><p>Online booking is not an emergency service.</p>{primary && <a className="btn btn-danger" href={`tel:${primary.phone}`}>Call {primary.phone}</a>}<label className="booking-choice"><input type="checkbox" checked={value.emergencyNoticeAcknowledged} onChange={(event) => onChange({ ...value, emergencyNoticeAcknowledged: event.target.checked })}/><span>I have read and understand this urgent notice.</span></label></div></div> : summaryReady ? <div className="patient-summary-editor"><label className="field"><span>Summary for the doctor</span><textarea className="input" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={1600}/></label>{value.unansweredQuestions.length > 0 && <p className="booking-field-help">Still unanswered: {value.unansweredQuestions.join("; ")}</p>}<div className="patient-ai-actions"><button className="btn btn-light" type="button" onClick={() => setSummaryReady(false)}>Continue chatting</button><button className="btn btn-primary" type="button" disabled={summary.trim().length < 10} onClick={approveSummary}><Check size={16}/> Use this summary</button></div></div> : <><div className="patient-ai-conversation" aria-live="polite"><p className="assistant-message">{question || "I can help organise your symptoms for the doctor. I cannot diagnose you or replace medical care. Tell me what is troubling you in your own words."}</p>{value.messages.map((message, index) => <p className={message.role === "PATIENT" ? "patient-message" : "assistant-message"} key={index}>{message.skipped ? "Question skipped" : message.content}</p>)}</div><label className="field"><span>Your answer</span><textarea className="input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200}/></label><div className="patient-ai-actions"><button className="btn btn-light" type="button" disabled={loading} onClick={skip}>Skip this question</button><button className="btn btn-light" type="button" disabled={loading || (!reason.trim() && !value.messages.length)} onClick={() => call("SUMMARISE")} >Finish and summarise</button><button className="btn btn-primary" type="button" disabled={loading || !input.trim()} onClick={send}>{loading ? <Loader2 className="toast-spinner" size={16}/> : <Send size={16}/>} Send</button></div></>}
        <button className="booking-restart" type="button" onClick={() => setPendingRestart(true)}><RotateCcw size={14}/> Start again</button>
      </>}
    </div>}
    <ConfirmationDialog open={pendingRestart} title="Start the symptom conversation again?" description="The conversation and AI summary will be cleared. Your manually entered reason and selected photos will be preserved." confirmLabel="Start again" danger busy={false} onCancel={() => setPendingRestart(false)} onConfirm={restart}/>
  </div>;
}
