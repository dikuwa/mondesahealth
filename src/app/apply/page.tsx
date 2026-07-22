import type { Metadata } from "next";
import { CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { ProviderApplicationForm } from "@/components/provider-application-form";

export const metadata: Metadata = {
  title: "Register your practice",
  description: "Apply to join the Mondesa Health independent practice platform.",
};

const applicationSteps = [
  { icon: ClipboardCheck, title: "Tell us about your practice", text: "Share the core details patients and the platform team need." },
  { icon: ShieldCheck, title: "We verify your information", text: "Every application is reviewed before a workspace is activated." },
  { icon: CheckCircle2, title: "You stay in control", text: "Approval never makes your practice public automatically." },
];

export default function ApplyPage() {
  return <main id="main-content" className="practice-application-page">
    <section className="practice-application-hero">
      <div className="container practice-application-layout">
        <div className="practice-application-intro">
          <span className="eyebrow">Join Mondesa Health</span>
          <h1>Bring your practice online with confidence.</h1>
          <p className="practice-application-lead">Apply for a secure, independent practice workspace built to simplify bookings, patient records and everyday administration.</p>
          <div className="practice-application-steps">
            {applicationSteps.map(({ icon: Icon, title, text }) => <div key={title}>
              <span><Icon size={19} aria-hidden="true" /></span>
              <p><strong>{title}</strong><small>{text}</small></p>
            </div>)}
          </div>
          <p className="practice-application-note"><ShieldCheck size={16} aria-hidden="true" /> Your details are used only to review and process this application.</p>
        </div>
        <ProviderApplicationForm />
      </div>
    </section>
  </main>;
}
