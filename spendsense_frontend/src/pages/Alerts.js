import React from "react";
import { Card } from "../components/ui";

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts page: monitoring rules + recent alert items placeholders. */
  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Alerts</h2>
          <p>Monitor anomalies, budgets, and custom rules.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">🔔</span> 2 active
        </span>
      </div>

      <div className="Grid GridCols3">
        <Card
          title="Large Transaction"
          subtitle="Notify when spend exceeds $200"
          actions={<span className="Pill PillSuccess">Enabled</span>}
        >
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Helps you quickly confirm unexpected charges.
          </p>
        </Card>

        <Card
          title="Category Budget"
          subtitle="Dining exceeds $300/month"
          actions={<span className="Pill PillWarn">Watching</span>}
        >
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Tracks a soft threshold and surfaces gentle reminders.
          </p>
        </Card>

        <Card
          title="Merchant Anomaly"
          subtitle="New merchant appears twice in 24h"
          actions={<span className="Pill PillError">Action</span>}
        >
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Flags potentially fraudulent patterns for review.
          </p>
        </Card>
      </div>

      <div style={{ height: 14 }} />

      <Card title="Recent Alerts" subtitle="Latest signals">
        <table className="Table" aria-label="Alerts table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Alert</th>
              <th>Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:12</td>
              <td>Merchant anomaly</td>
              <td>“Bloom Electronics” appeared twice</td>
              <td><span className="Pill PillError">Investigate</span></td>
            </tr>
            <tr>
              <td>Yesterday</td>
              <td>Dining budget</td>
              <td>Dining reached 92% of threshold</td>
              <td><span className="Pill PillWarn">Monitor</span></td>
            </tr>
            <tr>
              <td>2 days ago</td>
              <td>Large transaction</td>
              <td>$248.10 at “Aurora Travel”</td>
              <td><span className="Pill PillSuccess">Acknowledged</span></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
