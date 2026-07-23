import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { notifyStaff, notifyPlatformAdmins } from "@/lib/notifications";

type ApplicationEvent =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED";

const emailSubject: Record<ApplicationEvent, string> = {
  SUBMITTED: "Your practice application has been received",
  UNDER_REVIEW: "Your practice application is being reviewed",
  MORE_INFORMATION_REQUIRED: "More information is needed for your application",
  APPROVED: "Your practice application has been approved",
  REJECTED: "Your practice application status update",
};

const notificationTitle: Record<ApplicationEvent, string> = {
  SUBMITTED: "New practice application received",
  UNDER_REVIEW: "Application under review",
  MORE_INFORMATION_REQUIRED: "Information requested from applicant",
  APPROVED: "Application approved — practice setup pending",
  REJECTED: "Application rejected",
};

export async function sendApplicationNotification(
  event: ApplicationEvent,
  applicationId: string,
): Promise<void> {
  const application = await db.practiceApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      reference: true,
      practiceName: true,
      email: true,
      ownerName: true,
      status: true,
    },
  });
  if (!application) return;

  const formLink = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""}/platform/practices/applications?id=${application.id}`;

  // Notify platform admins
  await notifyPlatformAdmins({
    type: "APPLICATION_EVENT",
    title: notificationTitle[event],
    message: `${application.practiceName} (${application.reference}) — ${event}`,
    href: formLink,
  });

  // Send email to applicant if configured
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITATION_EMAIL_FROM?.trim();
  if (!apiKey || !from) return;

  const emailHtml: Record<ApplicationEvent, string> = {
    SUBMITTED: `<p>Hello ${application.ownerName},</p>
<p>Your application for <strong>${application.practiceName}</strong> has been received.</p>
<p>Reference: <strong>${application.reference}</strong></p>
<p>Your application will be reviewed and you may be contacted if more information is needed.</p>`,

    UNDER_REVIEW: `<p>Hello ${application.ownerName},</p>
<p>Your application for <strong>${application.practiceName}</strong> (${application.reference}) is now being reviewed.</p>
<p>You will be notified of the outcome or if further information is needed.</p>`,

    MORE_INFORMATION_REQUIRED: `<p>Hello ${application.ownerName},</p>
<p>Additional information is needed for your <strong>${application.practiceName}</strong> application (${application.reference}).</p>
<p>Please check your application status for details on what is required.</p>`,

    APPROVED: `<p>Hello ${application.ownerName},</p>
<p>Your application for <strong>${application.practiceName}</strong> (${application.reference}) has been <strong>approved</strong>.</p>
<p>You will receive a separate invitation to set up your practice workspace.</p>
<p>Note: Approval does not automatically publish your practice. You will complete the setup and publishing steps through your secure workspace.</p>`,

    REJECTED: `<p>Hello ${application.ownerName},</p>
<p>Your application for <strong>${application.practiceName}</strong> (${application.reference}) has been reviewed.</p>
<p>Please contact the platform team for more information about your application status.</p>`,
  };

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [application.email],
        subject: emailSubject[event],
        html: emailHtml[event],
      }),
      cache: "no-store",
    });
  } catch {
    // Email delivery is best-effort; application workflow continues regardless
  }
}
