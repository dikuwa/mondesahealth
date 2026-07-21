"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const types = ["image/png", "image/jpeg", "image/webp"];

export function PracticeBrandingManager({ name, initialLogo }: { name: string; initialLogo: string | null }) {
  const router = useRouter();
  const [logoData, setLogoData] = useState(initialLogo);
  const [saving, setSaving] = useState(false);
  function select(file?: File) {
    if (!file) return;
    if (!types.includes(file.type)) return toast.error("Choose a PNG, JPEG or WebP logo.");
    if (file.size > 1024 * 1024) return toast.error("Choose a logo smaller than 1 MB.");
    const reader = new FileReader();
    reader.onload = () => setLogoData(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function save() {
    setSaving(true);
    const toastId = toast.loading("Saving practice logo…");
    try {
      const response = await fetch("/api/practice/branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoData }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Practice branding updated", { id: toastId });
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save logo", { id: toastId }); }
    finally { setSaving(false); }
  }
  return <section className="card dashboard-card practice-logo-editor">
    <div className="practice-logo-preview">{logoData ? <Image src={logoData} alt={`${name} logo preview`} width={96} height={96} unoptimized /> : <span>{name.charAt(0)}</span>}</div>
    <div><h2>Practice logo</h2><p>This branding appears in your workspace and public practice page. PNG, JPEG or WebP; maximum 1 MB.</p>
      <div className="table-actions"><label className="btn btn-light"><Camera size={16} /> Choose logo<input className="visually-hidden" type="file" accept={types.join(",")} onChange={(event) => select(event.target.files?.[0])} /></label>
        {logoData && <button type="button" className="btn btn-light" onClick={() => setLogoData(null)}><Trash2 size={16} /> Remove</button>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save logo"}</button>
      </div>
    </div>
  </section>;
}
