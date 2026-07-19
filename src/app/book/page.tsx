import type { Metadata } from "next";
import { Clock3, Phone, ShieldCheck } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { db } from "@/lib/db";
import { neutralEmergencyMessage, orderEmergencyContacts } from "@/lib/emergency";

export const metadata: Metadata = { title: "Book an appointment" };
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const [funds, settings, emergencyRows, departments] = await Promise.all([
    db.medicalAid.findMany({
      where: { active: true, public: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.practiceSetting.findUnique({ where: { id: "practice" } }),
    db.emergencyContact.findMany({ where: { active: true }, orderBy: [{ primary: "desc" }, { sortOrder: "asc" }] }),
    db.department.findMany({ where: { public: true, bookingEnabled: true, status: "ACTIVE" }, select: { id: true, name: true, services: { where: { public: true }, select: { id: true, name: true, aiIntakeEnabled: true }, orderBy: { sortOrder: "asc" } }, providers: { where: { public: true }, select: { id: true, displayName: true, aiIntakeEnabled: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
  ]);
  const bookingMode = settings?.bookingMode || "AVAILABLE_TIME";
  const emergencyContacts = orderEmergencyContacts(emergencyRows);

  return (
    <main className="booking-page">
      <div className="container booking-layout">
        <aside className="booking-intro" aria-labelledby="booking-title">
          <div className="eyebrow">Online booking</div>
          <h1 id="booking-title" className="display">
            An appointment, without the back-and-forth.
          </h1>
          <p className="booking-intro-copy">
            {bookingMode === "AVAILABLE_TIME"
              ? "Choose a live available time. We’ll reserve it and show your reference and secure management link straight away."
              : "Tell us your preferred date and part of day. We’ll send your request to the practice and show your reference and secure management link straight away."}
          </p>
          <div className="booking-trust-list">
            <div>
              <Clock3 size={19} aria-hidden="true" />
              <span>
                <b>Usually 30 minutes</b>
                <small>Same-day bookings depend on availability.</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={19} aria-hidden="true" />
              <span>
                <b>No account needed</b>
                <small>Your booking details are handled securely.</small>
              </span>
            </div>
            <div>
              <Phone size={19} aria-hidden="true" />
              <span>
                <b>{emergencyContacts[0] ? `Emergency? Call ${emergencyContacts[0].phone}` : "Emergency guidance"}</b>
                <small>{emergencyContacts.length ? "Online booking is not an emergency service." : `Online booking is not an emergency service. ${neutralEmergencyMessage}`}</small>
              </span>
            </div>
          </div>
          {emergencyContacts.length > 1 && <details className="public-emergency-list"><summary>View all emergency contacts</summary>{emergencyContacts.map((contact) => <a key={contact.id} href={`tel:${contact.phone}`}><b>{contact.label}</b><span>{contact.phone}{contact.region ? ` · ${contact.region}` : ""}</span></a>)}</details>}
        </aside>
        <BookingForm
          funds={funds}
          mode={bookingMode}
          departments={departments}
          emergencyContacts={emergencyContacts}
          aiIntakeEnabled={settings?.aiIntakeEnabled ?? false}
          aiImageEnabled={settings?.aiImageEnabled ?? false}
        />
      </div>
    </main>
  );
}
