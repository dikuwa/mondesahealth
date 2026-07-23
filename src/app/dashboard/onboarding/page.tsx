import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getPracticeSession, hasSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OnboardingPage() {
  const hadCookie = await hasSessionCookie();
  const session = await getPracticeSession();
  if (!session) redirect(hadCookie ? "/platform" : "/login");

  const practice = await db.practice.findUnique({
    where: { id: session.practiceId },
    select: {
      id: true,
      status: true,
      onboardingProgress: {
        select: { submittedAt: true },
      },
    },
  });

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
    // Show the onboarding wizard
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
    return (
      <>
        <PageHeading
          eyebrow="Practice setup"
          title="Onboarding submitted"
        />
        <div className="card dashboard-card">
          <div className="dashboard-empty">
            <h3>Onboarding information submitted</h3>
            <p>
              Your onboarding information has been submitted for verification.
              The platform team will review your details and activate your
              workspace.
            </p>
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
