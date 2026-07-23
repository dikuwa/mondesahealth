import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ORIGINAL_PRACTICE_ID } from "@/lib/practice-constants";
import {
  neutralEmergencyMessage,
  primaryEmergencyContact,
} from "@/lib/emergency";
export const metadata: Metadata = { title: "Privacy and practice policies" };
const policies = (emergencyText: string) => [
  [
    "Privacy and confidentiality",
    "Mondesa Health collects only the personal, contact, appointment, medical-aid and billing information needed to arrange care, maintain clinical and financial records, communicate with you and meet professional obligations. Access is limited according to staff role. Sensitive identifiers are masked in general views.",
  ],
  [
    "Booking consent",
    "Submitting a booking authorises the practice to use the information provided to identify you, arrange the appointment and contact you using your chosen channel. Please provide only a short reason for your visit; detailed clinical information should be discussed privately with your practitioner.",
  ],
  [
    "Medical disclaimer and emergencies",
    `Website information is general and does not replace an examination or professional medical advice. Online booking is not monitored as an emergency service. ${emergencyText}`,
  ],
  [
    "Cancellation and late arrival",
    "Please give at least four hours’ notice when you cannot attend. Late arrival may shorten the consultation or require rescheduling so that other patients are not delayed. The practice may confirm any applicable fee before it is charged.",
  ],
  [
    "Electronic communication",
    "WhatsApp, SMS and email may be used for administrative messages, reminders, secure document links and appointment changes when you select them. Avoid sending detailed clinical information through ordinary messages. Secure links expire and should not be forwarded.",
  ],
  [
    "Data retention",
    "Patient, appointment, billing, claim and audit records are retained for the period required by applicable Namibian law, professional obligations and legitimate practice administration. Issued financial documents and audit entries are corrected by traceable adjustment rather than silent deletion.",
  ],
];
export default async function Policies() {
  const contacts = await db.emergencyContact.findMany({
    where: { practiceId: ORIGINAL_PRACTICE_ID, active: true },
    orderBy: [{ primary: "desc" }, { sortOrder: "asc" }],
  });
  const primary = primaryEmergencyContact(contacts);
  const emergencyText = primary
    ? `For an emergency, call ${primary.label} on ${primary.phone} or attend the nearest emergency facility.`
    : neutralEmergencyMessage;
  return (
    <main id="main-content">
      <section className="section policies-hero">
        <div className="container policies-content">
          <div className="eyebrow">Privacy & policies</div>
          <h1 className="display">
            Clear terms, in plain language.
          </h1>
          <p>
            These policies explain how online booking and practice communication
            work. Final retention periods and practice-specific fees should be
            reviewed by the owner&rsquo;s legal and clinical advisers before launch.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container policies-content">
          {policies(emergencyText).map(([title, text]) => (
            <article key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
