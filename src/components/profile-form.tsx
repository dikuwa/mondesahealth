"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

const MAX_AVATAR_FILE_BYTES = 2 * 1024 * 1024;
const acceptedAvatarTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
];
const acceptedAvatarLabel = "PNG, JPEG, WebP, GIF or AVIF";

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    role: string;
    avatarData: string | null;
    mustChangePassword: boolean;
  };
}) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatarData || "");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    const id = toast.loading("Saving your profile…");
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          avatarData: avatar,
          currentPassword: form.get("currentPassword") || undefined,
          newPassword: form.get("newPassword") || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(
        data.sessionInvalidated
          ? "Password changed. Sign in again."
          : "Profile updated",
        { id },
      );
      if (data.sessionInvalidated) {
        router.push("/login?reason=password-changed");
        router.refresh();
        return;
      }
      router.refresh();
      (formElement.elements.namedItem("currentPassword") as HTMLInputElement).value = "";
      (formElement.elements.namedItem("newPassword") as HTMLInputElement).value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile", { id });
    } finally {
      setSaving(false);
    }
  }

  function image(file?: File) {
    if (!file) return;
    if (!acceptedAvatarTypes.includes(file.type)) {
      toast.error(`Choose a ${acceptedAvatarLabel} image.`);
      return;
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      toast.error("Choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={submit} className="profile-grid">
      <section className="card dashboard-card profile-card">
        <div className="profile-avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Profile preview" />
          ) : (
            <span>{user.name.charAt(0)}</span>
          )}
          <label title="Choose profile image">
            <Camera size={17} />
            <input
              type="file"
              accept={acceptedAvatarTypes.join(",")}
              onChange={(event) => image(event.target.files?.[0])}
            />
          </label>
        </div>
        <h2>{user.name}</h2>
        <p>{user.role} · {user.email}</p>
        {avatar && (
          <button type="button" className="text-button" onClick={() => setAvatar("")}>
            Remove photo
          </button>
        )}
      </section>

      <section className="card dashboard-card" style={{ padding: 24 }}>
        <h2>Profile details</h2>
        {user.mustChangePassword && (
          <p className="notice-warning">
            Your password was set by an administrator. Change it now.
          </p>
        )}
        <div className="field">
          <label>Display name</label>
          <input className="input" name="name" defaultValue={user.name} required />
        </div>
        <div className="field" style={{ marginTop: 15 }}>
          <label>Login email</label>
          <input className="input" value={user.email} disabled />
          <small>Only an owner can resolve a login-email conflict.</small>
        </div>
        <h3 style={{ marginTop: 28 }}>Change password</h3>
        <div className="field">
          <label>Current password</label>
          <input
            className="input"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </div>
        <div className="field" style={{ marginTop: 15 }}>
          <label>New password</label>
          <input
            className="input"
            name="newPassword"
            type="password"
            minLength={12}
            autoComplete="new-password"
          />
          <small>Use 12+ characters with uppercase, lowercase, a number, and a symbol.</small>
        </div>
        <button className="btn btn-primary" disabled={saving} style={{ marginTop: 22 }}>
          {saving ? <Loader2 className="toast-spinner" size={17} /> : <Save size={17} />} Save profile
        </button>
      </section>
    </form>
  );
}
