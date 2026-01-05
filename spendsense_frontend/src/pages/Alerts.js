import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { EmptyState, ErrorState, FilterBar, SkeletonTable } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";
import { fetchAlertsFromSupabase } from "../lib/data/supabaseQueries";
import { getAuthenticatedUserId } from "../auth/userContext";

function severityPillClass(severity) {
  if (severity === "high") return "PillError";
  if (severity === "medium") return "PillWarn";
  if (severity === "low") return "PillInfo";
  return "";
}

function statusPillClass(status) {
  if (status === "active") return "PillSuccess";
  if (status === "paused") return "PillWarn";
  if (status === "resolved") return "PillInfo";
  return "";
}

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts page: Supabase-backed alerts (rules + triggered), filterable, realtime refresh on new transactions (for triggered alerts workflows). */

  const [filters, setFilters] = useState({
    status: "all",
    severity: "all"
  });

  const [state, setState] = useState({ loading: true, error: null, data: [] });

  const summary = useMemo(() => {
    const parts = [];
    if (filters.status && filters.status !== "all") parts.push(`Status: ${filters.status}`);
    if (filters.severity && filters.severity !== "all") parts.push(`Severity: ${filters.severity}`);
    return parts.length ? parts.join(" • ") : "All alerts";
  }, [filters]);

  const refreshAlerts = useCallback(async () => {
    try {
      setState((p) => ({ ...p, loading: true, error: null }));
      const userId = await getAuthenticatedUserId();
      const data = await fetchAlertsFromSupabase({
        userId,
        allowDemoUser: true,
        status: filters.status,
        severity: filters.severity,
        limit: 30
      });
      setState({ loading: false, error: null, data: data || [] });
    } catch (e) {
      setState({ loading: false, error: e?.message || String(e), data: [] });
    }
  }, [filters.severity, filters.status]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  // Realtime: inserts into transactions might lead to triggered alerts; refresh the list to surface them.
  const { notice } = useTransactionsRealtime({
    onRefreshRequested: refreshAlerts
  });

  const onClearAll = () => setFilters({ status: "all", severity: "all" });

  const onRemoveFilter = (key) => {
    if (key === "status") setFilters((p) => ({ ...p, status: "all" }));
    if (key === "severity") setFilters((p) => ({ ...p, severity: "all" }));
  };

  const rules = useMemo(() => (state.data || []).filter((a) => a.kind === "rule").slice(0, 3), [state.data]);
  const recent = useMemo(() => (state.data || []).slice(0, 12), [state.data]);

  return (
    <>
      <ToastNotice message={notice} />

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

        <div className="Field" style={{ minWidth: 200 }}>
          <div className="FieldLabel">Actions</div>
          <button className="Button ButtonPrimary" type="button" onClick={refreshAlerts} disabled={state.loading}>
            Refresh
          </button>
          <div className="FieldHelp">Loads from <code>public.alerts</code> (demo user scope until auth is enabled).</div>
        </div>
      </FilterBar>

      <div style={{ height: 14 }} />

      {state.loading ? (
        <>
          <div className="Grid GridCols3">
            <Card title="Loading…" subtitle="Fetching alert rules">
              <div className="Skeleton" style={{ height: 110 }} />
            </Card>
            <Card title="Loading…" subtitle="Fetching alert rules">
              <div className="Skeleton" style={{ height: 110 }} />
            </Card>
            <Card title="Loading…" subtitle="Fetching alert rules">
              <div className="Skeleton" style={{ height: 110 }} />
            </Card>
          </div>
          <div style={{ marginTop: 14 }}>
            <SkeletonTable rows={4} columns={4} />
          </div>
        </>
      ) : state.error ? (
        <ErrorState title="Couldn't load alerts" message={state.error} onRetry={refreshAlerts} />
      ) : !state.data?.length ? (
        <EmptyState
          title="No alerts found"
          message="If Supabase is configured, seed data should include alert rules and a few triggered alerts. Try clearing filters or reloading."
          ctaLabel="Clear filters"
          onCta={() => {
            onClearAll();
            refreshAlerts();
          }}
          secondaryLabel="Reload"
          onSecondary={refreshAlerts}
        />
      ) : (
        <>
          <div className="Grid GridCols3">
            {(rules.length ? rules : recent.slice(0, 3)).map((a) => (
              <Card
                key={a.id}
                title={a.title}
                subtitle={a.kind === "rule" ? "Rule" : "Triggered alert"}
                actions={<span className={`Pill ${statusPillClass(a.status)}`}>{a.status}</span>}
              >
                <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{a.message || "—"}</p>
                <div style={{ height: 10 }} />
                <span className={`Pill ${severityPillClass(a.severity)}`}>Severity: {a.severity}</span>
              </Card>
            ))}
          </div>

          <div style={{ height: 14 }} />

          <Card title="Recent Alerts" subtitle="Latest signals from Supabase">
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
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>{String(a.triggered_at || a.updated_at || a.created_at || "").slice(0, 16).replace("T", " ") || "—"}</td>
                    <td>{a.title}</td>
                    <td>{a.message || "—"}</td>
                    <td>
                      <span className={`Pill ${statusPillClass(a.status)}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
