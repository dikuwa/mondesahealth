"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

export function ContentManager({ initial }: { initial: any }) {
  const [value, setValue] = useState(JSON.stringify(initial, null, 2));
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save() {
    setSaving(true);
    try {
      const parsed = JSON.parse(value);
      const response = await fetch("/api/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Website content saved"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid content JSON"); }
    finally { setSaving(false); }
  }
  return <div className="card content-manager"><p className="muted">Edit homepage sections as structured content. Keep the JSON shape intact; empty text hides gracefully on the public site.</p><textarea className="input content-json-editor" value={value} onChange={(event) => setValue(event.target.value)} spellCheck={false} aria-label="Website content JSON" /><button className="btn btn-primary" onClick={save} disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save website content"}</button></div>;
}
