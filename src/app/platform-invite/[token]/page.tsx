"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PlatformInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<{ name: string; email: string; role: string; existingAccount: boolean; passwordReset: boolean } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch(`/api/platform-invitations/${token}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setDetail(data); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load invitation"));
  }, [token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/platform-invitations/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.passwordReset ? "Password updated securely" : "Platform access activated");
      router.push("/login");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not accept invitation");
    } finally { setSaving(false); }
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{detail?.passwordReset ? "Platform security" : "Platform team invitation"}</span>
        <h1>{detail ? detail.passwordReset ? "Reset your password" : `Join as ${detail.role.replaceAll("_", " ")}` : "Platform access"}</h1>
        {error ? <p className="notice-warning">{error}</p> : (
          <>
            <p>{detail ? detail.passwordReset ? `${detail.name}, create a new secure password for ${detail.email}. This one-time link expires after 24 hours.` : detail.existingAccount ? `${detail.name}, enter the password for ${detail.email} to link platform access.` : `${detail.name}, create a secure password for ${detail.email}.` : "Checking your invitation…"}</p>
            {detail && <label><span>{detail.passwordReset ? "New password" : detail.existingAccount ? "Existing password" : "Create password"}</span><input className="input" name="password" type="password" autoComplete={detail.passwordReset || !detail.existingAccount ? "new-password" : "current-password"} required minLength={12} /></label>}
            <button className="btn btn-primary" disabled={!detail || saving}>{saving ? "Saving…" : detail?.passwordReset ? "Set new password" : "Activate platform access"}</button>
          </>
        )}
      </form>
    </main>
  );
}
