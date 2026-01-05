import React, { useMemo, useState } from "react";
import { Card } from "../components/ui";
import { EmptyState, ErrorState, FilterBar, SkeletonTable } from "../components/ux";

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts page: filters + rules + recent alert items placeholders with robust UX states (local state only). */

  const [filters, setFilters] = useState({
    status: "active",
    severity: "all"
  });

  // Demo-only UI states (no real fetch yet).
  const [uiState, setUiState] = useState("ready"); // "loading" | "empty" | "error" | "ready"

  const summary = useMemo(() => {
    const parts = [];
    if (filters.status && filters.status !== "all") parts.push(`Status: ${filters.status}`);
    if (filters.severity && filters.severity !== "all") parts.push(`Severity: ${filters.severity}`);
    return parts.length ? parts.join(" • ") : "All alerts";
  }, [filters]);

  const onClearAll = () => setFilters({ status: "active", severity: "all" });

  const onRemoveFilter = (key) => {
    if (key === "status") setFilters((p) => ({ ...p, status: "all" }));
    if (key === "severity") setFilters((p) => ({ ...p, severity: "all" }));
  };

  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Alerts</h2>
          <p>Monitor anomalies, budgets, and custom rules.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">🔔</span> {summary}
        </span>
      </div>

      <FilterBar title="Alert Filters" filters={filters} onClearAll={onClearAll} onRemoveFilter={onRemoveFilter}>
        <div className="Field" style={{ minWidth: 220 }}>
          <div className="FieldLabel">Status</div>
          <select
            className="Select"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            aria-label="Alert status filter"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="Field" style={{ minWidth: 220 }}>
          <div className="FieldLabel">Severity</div>
          <select
            className="Select"
            value={filters.severity}
            onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}
            aria-label="Alert severity filter"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="Field" style={{ minWidth: 220 }}>
          <div className="FieldLabel">Demo state</div>
          <select className="Select" value={uiState} onChange={(e) => setUiState(e.target.value)} aria-label="Demo state">
            <option value="ready">Ready</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty</option>
            <option value="error">Error</option>
          </select>
        </div>
      </FilterBar>

      <div style={{ height: 14 }} />

      {uiState === "loading" ? (
        <div className="Grid GridCols3">
          <Card title="Loading…" subtitle="Fetching alert rules"><div className="Skeleton" style={{ height: 110 }} /></Card>
          <Card title="Loading…" subtitle="Fetching alert rules"><div className="Skeleton" style={{ height: 110 }} /></Card>
          <Card title="Loading…" subtitle="Fetching alert rules"><div className="Skeleton" style={{ height: 110 }} /></Card>
        </div>
      ) : uiState === "error" ? (
        <ErrorState
          title="Couldn't load alerts"
          message="This is a UI-only error placeholder. Hook up retry when backend fetching is added."
          onRetry={() => setUiState("ready")}
        />
      ) : uiState === "empty" ? (
        <EmptyState
          title="No alerts found"
          message="Try changing status/severity filters, or clear all to see everything."
          ctaLabel="Clear filters"
          onCta={() => {
            onClearAll();
            setUiState("ready");
          }}
          secondaryLabel="Set to Ready"
          onSecondary={() => setUiState("ready")}
        />
      ) : (
        <>
          <div className="Grid GridCols3">
            <Card
              title="Large Transaction"
              subtitle="Notify when spend exceeds $200"
              actions={<span className="Pill PillSuccess">Enabled</span>}
            >
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Helps you quickly confirm unexpected charges.</p>
            </Card>

            <Card
              title="Category Budget"
              subtitle="Dining exceeds $300/month"
              actions={<span className="Pill PillWarn">Watching</span>}
            >
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Tracks a soft threshold and surfaces gentle reminders.</p>
            </Card>

            <Card
              title="Merchant Anomaly"
              subtitle="New merchant appears twice in 24h"
              actions={<span className="Pill PillError">Action</span>}
            >
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Flags potentially fraudulent patterns for review.</p>
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
                  <td>
                    <span className="Pill PillError">Investigate</span>
                  </td>
                </tr>
                <tr>
                  <td>Yesterday</td>
                  <td>Dining budget</td>
                  <td>Dining reached 92% of threshold</td>
                  <td>
                    <span className="Pill PillWarn">Monitor</span>
                  </td>
                </tr>
                <tr>
                  <td>2 days ago</td>
                  <td>Large transaction</td>
                  <td>$248.10 at “Aurora Travel”</td>
                  <td>
                    <span className="Pill PillSuccess">Acknowledged</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}

      {uiState === "loading" ? (
        <div style={{ marginTop: 14 }}>
          <SkeletonTable rows={4} columns={4} />
        </div>
      ) : null}
    </>
  );
}
