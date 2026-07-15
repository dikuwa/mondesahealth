"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

type Setting = {
  practiceName: string;
  doctorName: string;
  practiceNumber: string;
  registrationNumber: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  currency: string;
  signatureName: string;
  signatureTitle: string;
  vatEnabled: boolean;
  tagline: string;
  publicDescription: string;
  locationNote: string;
  mapsUrl: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  publicHours: string | null;
  showEmail: boolean;
  showWhatsapp: boolean;
};

type Fund = {
  id: string;
  name: string;
  abbreviation: string | null;
  administrator: string | null;
  public: boolean;
  active: boolean;
};

export function SettingsManager({
  setting,
  funds,
}: {
  setting: Setting;
  funds: Fund[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function patch(body: object, message: string) {
    setSaving(true);
    const id = toast.loading(message);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Settings saved", { id });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save settings",
        { id },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-equal-columns settings-grid">
      <form
        className="card dashboard-card settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          patch(
            {
              ...data,
              vatEnabled:
                new FormData(event.currentTarget).get("vatEnabled") === "on",
            },
            "Saving practice settings…",
          );
        }}
      >
        <h2>Practice details</h2>
        <div className="settings-fields">
          {[
            ["practiceName", "Practice"],
            ["doctorName", "Practitioner"],
            ["practiceNumber", "Practice no."],
            ["registrationNumber", "Registration"],
            ["phone", "Phone"],
            ["whatsapp", "WhatsApp"],
            ["email", "Email"],
            ["address", "Address"],
          ].map(([name, label]) => (
            <div className="field" key={name}>
              <label htmlFor={`setting-${name}`}>{label}</label>
              <input
                id={`setting-${name}`}
                className="input"
                name={name}
                type={name === "email" ? "email" : "text"}
                defaultValue={setting[name as keyof Setting] as string}
                required
              />
            </div>
          ))}
        </div>
        <div className="settings-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="toast-spinner" size={17} />} Save
            practice
          </button>
        </div>
      </form>

      <form
        className="card dashboard-card settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          patch(
            {
              ...setting,
              ...data,
              vatEnabled:
                new FormData(event.currentTarget).get("vatEnabled") === "on",
            },
            "Saving document settings…",
          );
        }}
      >
        <div className="settings-card-heading">
          <h2>Document settings</h2>
          <p className="muted">
            Shared across invoices, receipts, claim accounts, statements and
            batch summaries.
          </p>
        </div>
        <div className="settings-fields">
          {[
            ["currency", "Currency"],
            ["signatureName", "Signatory"],
            ["signatureTitle", "Title"],
          ].map(([name, label]) => (
            <div className="field" key={name}>
              <label htmlFor={`setting-${name}`}>{label}</label>
              <input
                id={`setting-${name}`}
                className="input"
                name={name}
                defaultValue={setting[name as keyof Setting] as string}
                required
              />
            </div>
          ))}
        </div>
        <label className="toggle-label settings-checkbox-row">
          <input
            type="checkbox"
            name="vatEnabled"
            defaultChecked={setting.vatEnabled}
          />
          <span>VAT enabled</span>
        </label>
        <div className="settings-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? (
              <Loader2 className="toast-spinner" size={17} />
            ) : (
              <Save size={17} />
            )}
            Save documents
          </button>
        </div>
      </form>

      <form
        className="card dashboard-card settings-form dashboard-span-all"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          patch(
            {
              ...setting,
              ...data,
              mapLatitude: data.mapLatitude === "" ? null : Number(data.mapLatitude),
              mapLongitude: data.mapLongitude === "" ? null : Number(data.mapLongitude),
              publicHours: data.publicHours || null,
              showEmail: new FormData(form).has("showEmail"),
              showWhatsapp: new FormData(form).has("showWhatsapp"),
            },
            "Saving public site settings…",
          );
        }}
      >
        <div className="settings-card-heading">
          <h2>Public site</h2>
          <p className="muted">These confirmed details appear on the public website. Email, WhatsApp and hours stay hidden until you publish them.</p>
        </div>
        <div className="settings-fields settings-public-fields">
          <div className="field settings-wide"><label htmlFor="setting-tagline">Tagline</label><input id="setting-tagline" className="input" name="tagline" defaultValue={setting.tagline} required /></div>
          <div className="field settings-wide"><label htmlFor="setting-publicDescription">Public description</label><textarea id="setting-publicDescription" className="input" name="publicDescription" defaultValue={setting.publicDescription} required /></div>
          <div className="field"><label htmlFor="setting-locationNote">Location note</label><input id="setting-locationNote" className="input" name="locationNote" defaultValue={setting.locationNote} /></div>
          <div className="field"><label htmlFor="setting-mapsUrl">Google Maps URL</label><input id="setting-mapsUrl" className="input" name="mapsUrl" type="url" defaultValue={setting.mapsUrl} /></div>
          <div className="field"><label htmlFor="setting-mapLatitude">Latitude</label><input id="setting-mapLatitude" className="input" name="mapLatitude" type="number" step="any" min="-90" max="90" defaultValue={setting.mapLatitude ?? ""} /></div>
          <div className="field"><label htmlFor="setting-mapLongitude">Longitude</label><input id="setting-mapLongitude" className="input" name="mapLongitude" type="number" step="any" min="-180" max="180" defaultValue={setting.mapLongitude ?? ""} /></div>
          <div className="field settings-wide"><label htmlFor="setting-publicHours">Opening hours (optional)</label><textarea id="setting-publicHours" className="input" name="publicHours" defaultValue={setting.publicHours ?? ""} placeholder="Leave blank until confirmed" /></div>
        </div>
        <div className="settings-visibility">
          <label className="toggle-label settings-checkbox-row"><input type="checkbox" name="showEmail" defaultChecked={setting.showEmail} /><span>Show email publicly</span></label>
          <label className="toggle-label settings-checkbox-row"><input type="checkbox" name="showWhatsapp" defaultChecked={setting.showWhatsapp} /><span>Show WhatsApp publicly</span></label>
        </div>
        <div className="settings-form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="toast-spinner" size={17} /> : <Save size={17} />}Save public site</button></div>
      </form>

      <section className="card dashboard-card dashboard-span-all settings-funds">
        <h2>Medical aids</h2>
        <div className="table-scroll">
          <table className="data-table settings-funds-table">
            <thead>
              <tr>
                <th>Fund</th>
                <th>Administrator</th>
                <th>Public</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((fund) => (
                <tr key={fund.id}>
                  <td>
                    <b>{fund.name}</b>
                    <small>{fund.abbreviation}</small>
                  </td>
                  <td>{fund.administrator || "Not configured"}</td>
                  <td>
                    <input
                      aria-label={`${fund.name} public`}
                      type="checkbox"
                      checked={fund.public}
                      disabled={saving}
                      onChange={(event) =>
                        patch(
                          {
                            medicalAidId: fund.id,
                            public: event.target.checked,
                            active: fund.active,
                            administrator: fund.administrator,
                          },
                          "Updating medical aid…",
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${fund.name} active`}
                      type="checkbox"
                      checked={fund.active}
                      disabled={saving}
                      onChange={(event) =>
                        patch(
                          {
                            medicalAidId: fund.id,
                            active: event.target.checked,
                            public: fund.public,
                            administrator: fund.administrator,
                          },
                          "Updating medical aid…",
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
