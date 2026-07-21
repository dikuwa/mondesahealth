type InvitationEmailInput = {
  to: string;
  name: string;
  practiceName: string;
  inviteUrl: string;
};

type InvitationEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: string };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<InvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITATION_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return {
      sent: false,
      reason: "Invitation email is not configured. Copy and send the secure link manually.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Set up your ${input.practiceName} account`,
      html: `<p>Hello ${escapeHtml(input.name)},</p><p>You have been invited to manage <strong>${escapeHtml(input.practiceName)}</strong> on Mondesa Health.</p><p><a href="${escapeHtml(input.inviteUrl)}">Set up your account</a></p><p>This private link expires in 7 days. If you were not expecting it, do not open or forward it.</p>`,
      text: `Hello ${input.name},\n\nYou have been invited to manage ${input.practiceName} on Mondesa Health.\n\nSet up your account: ${input.inviteUrl}\n\nThis private link expires in 7 days. If you were not expecting it, do not open or forward it.`,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: { message?: string } }
    | null;
  if (!response.ok) {
    return {
      sent: false,
      reason:
        payload?.message ||
        payload?.error?.message ||
        "The invitation was created, but email delivery failed.",
    };
  }
  return { sent: true, id: payload?.id || null };
}
