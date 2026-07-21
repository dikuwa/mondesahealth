import { afterEach, describe, expect, it, vi } from "vitest";
import { sendInvitationEmail } from "@/lib/invitation-email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("optional invitation email", () => {
  it("fails safely without transport configuration", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("INVITATION_EMAIL_FROM", "");
    const request = vi.spyOn(globalThis, "fetch");
    const result = await sendInvitationEmail({
      to: "owner@example.com",
      name: "Owner",
      practiceName: "Example Practice",
      inviteUrl: "https://example.com/invite/private",
    });
    expect(result.sent).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("uses the configured HTTPS transport and escapes HTML", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("INVITATION_EMAIL_FROM", "Invites <invites@example.com>");
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await sendInvitationEmail({
      to: "owner@example.com",
      name: "Owner <Admin>",
      practiceName: "Care & Co",
      inviteUrl: "https://example.com/invite/private",
    });
    expect(result).toEqual({ sent: true, id: "email-1" });
    expect(request).toHaveBeenCalledOnce();
    const options = request.mock.calls[0][1];
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(String(options?.body)).toContain("Owner &lt;Admin&gt;");
    expect(String(options?.body)).toContain("Care &amp; Co");
  });
});
