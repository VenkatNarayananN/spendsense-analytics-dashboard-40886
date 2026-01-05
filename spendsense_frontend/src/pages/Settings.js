import React from "react";
import { Card } from "../components/ui";

// PUBLIC_INTERFACE
export default function Settings() {
  /** Settings page: user/workspace preferences placeholders. */
  const hasSupabaseUrl = Boolean(process.env.REACT_APP_SUPABASE_URL);
  const hasSupabaseKey = Boolean(process.env.REACT_APP_SUPABASE_KEY);

  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Settings</h2>
          <p>Manage preferences for your SpendSense dashboard.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">⚙️</span> Workspace
        </span>
      </div>

      <div className="Grid GridCols2">
        <Card title="Appearance" subtitle="Ocean Professional (light)">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Theme is configured via CSS variables to ensure consistent colors across components.
            </div>
            <button className="Button ButtonPrimary" type="button">
              Customize (placeholder)
            </button>
          </div>
        </Card>

        <Card title="Integrations" subtitle="Connectivity status (placeholders)">
          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <div>
              Supabase URL:{" "}
              <span className={`Pill ${hasSupabaseUrl ? "PillSuccess" : "PillWarn"}`}>
                {hasSupabaseUrl ? "Configured" : "Missing"}
              </span>
            </div>
            <div>
              Supabase Key:{" "}
              <span className={`Pill ${hasSupabaseKey ? "PillSuccess" : "PillWarn"}`}>
                {hasSupabaseKey ? "Configured" : "Missing"}
              </span>
            </div>
            <div style={{ opacity: 0.75 }}>
              Note: keys are read from environment variables and never rendered.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ height: 14 }} />

      <Card title="Notifications" subtitle="Alert preferences">
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <input type="checkbox" defaultChecked />
            Email alerts (placeholder)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <input type="checkbox" />
            Push alerts (placeholder)
          </label>
          <button className="Button" type="button">
            Save preferences (placeholder)
          </button>
        </div>
      </Card>
    </>
  );
}
