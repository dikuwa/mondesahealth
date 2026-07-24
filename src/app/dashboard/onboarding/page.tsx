import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Mail } from "lucide-react";
import { PageHeading } from "@/components/dashboard";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getPracticeSession, hasSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

async function getPracticeData(practiceId: string) {
  return db.practice.findUnique({
    where: { id: practiceId },
    select: {
      id: true,
      status: true,
      name: true,
      email: true,
      onboardingProgress: {
        select: {
          submittedAt: true,
          currentStep: true,
        },
      },
    },
  });
}

export default async function OnboardingPage() {
  const hadCookie = await hasSessionCookie();
  const session = await getPracticeSession();
  if (!session) redirect(hadCookie ? "/platform" : "/login");

  const practice = await getPracticeData(session.practiceId);

  if (!practice) redirect("/login?reason=session-expired");

  // Transition PENDING_SETUP → ONBOARDING on first visit
  if (practice.status === "PENDING_SETUP") {
    await db.practice.update({
      where: { id: practice.id },
      data: { status: "ONBOARDING" },
    });
    practice.status = "ONBOARDING";
  }

  if (practice.status === "ONBOARDING") {
    return (
      <>
        <PageHeading
          eyebrow="Practice setup"
          title="Complete your practice profile"
        />
        <p className="onboarding-intro">
          Set up your practice identity, team, services and preferences. Your
          progress is saved automatically as you go.
        </p>
        <OnboardingWizard practiceId={practice.id} />
      </>
    );
  }

  if (practice.status === "PENDING_VERIFICATION") {
    const submittedAt = practice.onboardingProgress?.submittedAt;
    return (
      <>
        <PageHeading
          eyebrow="Practice setup"
          title="Onboarding submitted"
        />
        <div className="card dashboard-card onboarding-complete-card">
          <div className="onboarding-complete-header">
            <div className="onboarding-complete-icon">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <h2>Onboarding information submitted</h2>
            <p className="onboarding-complete-description">
              Your practice profile has been received and is pending review by the platform team.
            </p>
          </div>

          <div className="onboarding-timeline">
            <div className="timeline-step completed">
              <CheckCircle2 size={18} />
              <div>
                <b>Step 1 – Onboarding completed</b>
                {submittedAt && (
                  <small>{new Date(submittedAt).toLocaleDateString("en-NA", {
                    year: "numeric", month: "long", day: "numeric",
                  })}</small>
                )}
              </div>
            </div>
            <div className="timeline-step active">
              <Clock size={18} />
              <div>
                <b>Step 2 – Platform review</b>
                <small>The platform team will review your information and documents.</small>
              </div>
            </div>
            <div className="timeline-step pending">
              <ArrowRight size={18} />
              <div>
                <b>Step 3 – Workspace activation</b>
                <small>Your private workspace will be activated after verification.</small>
              </div>
            </div>
          </div>

          <div className="onboarding-complete-details">
            <div className="detail-card">
              <Mail size={20} />
              <div>
                <h4>What happens next?</h4>
                <p>
                  A platform reviewer will check your practice details and
                  documents. You may be contacted if more information is needed.
                  Once approved, your private workspace becomes accessible.
                </p>
              </div>
            </div>
            <div className="detail-card">
              <Clock size={20} />
              <div>
                <h4>How long does it take?</h4>
                <p>
                  Most applications are reviewed within 1–2 business days.
                  You will receive a notification once the review is complete.
                </p>
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <Link className="btn btn-light" href="/dashboard">
              <ArrowRight size={15} /> Go to dashboard
            </Link>
            {practice.email && (
              <p className="onboarding-contact-notice">
                We will contact you at <strong>{practice.email}</strong> when
                the review is complete.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // Active practices go to dashboard
  if (["ACTIVE", "ACTIVE_PRIVATE", "ACTIVE_PUBLIC"].includes(practice.status)) {
    redirect("/dashboard");
  }

  // Fallback for other statuses
  redirect("/dashboard");
}
