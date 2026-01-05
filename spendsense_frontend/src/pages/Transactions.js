import React from "react";
import { Card } from "../components/ui";

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions page: filter controls + transaction table placeholder. */
  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Transactions</h2>
          <p>Browse, search, and categorize spending activity.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">🧾</span> 128 items
        </span>
      </div>

      <div className="Grid GridCols2">
        <Card title="Filters" subtitle="Refine the list">
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Category
              <select className="SearchInput" style={{ width: "100%" }} defaultValue="All">
                <option>All</option>
                <option>Dining</option>
                <option>Groceries</option>
                <option>Transport</option>
                <option>Subscriptions</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Date range
              <select className="SearchInput" style={{ width: "100%" }} defaultValue="This month">
                <option>This month</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="Button ButtonPrimary" type="button">Apply</button>
              <button className="Button" type="button">Reset</button>
            </div>
          </div>
        </Card>

        <Card title="Summary" subtitle="Quick totals">
          <div className="Grid" style={{ gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Total spend (filtered)</div>
              <div className="Metric">$1,204.33</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Average transaction</div>
              <div className="Metric">$24.09</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ height: 14 }} />

      <Card title="Transaction List" subtitle="Placeholder table (wire to backend later)">
        <table className="Table" aria-label="Transactions table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-01-05</td>
              <td>Silver Streaming</td>
              <td>Subscriptions</td>
              <td>-$12.99</td>
              <td><span className="Pill PillWarn">Review</span></td>
            </tr>
            <tr>
              <td>2026-01-04</td>
              <td>Rose Market</td>
              <td>Groceries</td>
              <td>-$96.72</td>
              <td><span className="Pill">—</span></td>
            </tr>
            <tr>
              <td>2026-01-03</td>
              <td>Ocean Café</td>
              <td>Dining</td>
              <td>-$18.40</td>
              <td><span className="Pill PillSuccess">OK</span></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
