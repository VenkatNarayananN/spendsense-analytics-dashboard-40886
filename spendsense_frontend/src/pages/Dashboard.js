import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, MetricCard } from "../components/ui";
import { LineChartPlaceholder, PieChartPlaceholder } from "../components/charts/ChartPlaceholders";
import { EmptyState, ErrorState, SkeletonCard, SkeletonTable } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { fetchDashboardSummary } from "../lib/data/dashboardData";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";
import { fetchRecentTransactionsFromSupabase } from "../lib/data/supabaseQueries";

function formatAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-$—";
  // Seed data uses negative for expenses; normalize to "-$xx".
  const sign = n < 0 ? "-" : "+";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function statusPillClass(status) {
  if (status === "cleared") return "PillSuccess";
  if (status === "pending") return "PillWarn";
  if (status === "void") return "PillError";
  return "";
}

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard page: loads real KPI + recent activity from Supabase; refreshes on realtime transaction INSERTs. */

  const [summaryState, setSummaryState] = useState({ loading: true, error: null, data: null });
  const [recentState, setRecentState] = useState({ loading: true, error: null, data: [] });

  const refreshSummary = useCallback(async () => {
    try {
      setSummaryState((p) => ({ ...p, loading: true, error: null }));
      const next = await fetchDashboardSummary();
      setSummaryState({ loading: false, error: null, data: next });
    } catch (e) {
      setSummaryState({ loading: false, error: e?.message || String(e), data: null });
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      setRecentState((p) => ({ ...p, loading: true, error: null }));
      const rows = await fetchRecentTransactionsFromSupabase({ allowDemoUser: true, limit: 6 });
      setRecentState({ loading: false, error: null, data: rows || [] });
    } catch (e) {
      setRecentState({ loading: false, error: e?.message || String(e), data: [] });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshRecent()]);
  }, [refreshRecent, refreshSummary]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const { notice } = useTransactionsRealtime({
    onRefreshRequested: refreshAll
  });

  const freshnessText = useMemo(() => {
    if (summaryState.loading) return "Loading…";
    if (summaryState.error) return "Error loading";
    return summaryState.data?.freshnessLabel || "Live";
  }, [summaryState]);

  const kpis = summaryState.data;

  return (
    <>
      <ToastNotice message={notice} />

      <div className="PageHeader">
        <div>
          <h2>Dashboard</h2>
          <p>Key metrics, trends, and quick signals across your spending.</p>
        </div>
        <span className="Badge" aria-label="Data freshness">
          <span aria-hidden="true">⏱️</span> {freshnessText}
        </span>
      </div>

      {summaryState.loading ? (
        <>
          <div className="Grid GridCols3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols2">
            <Card title="Spending Trend" subtitle="Last 30 days">
              <div className="Skeleton" style={{ height: 220, borderRadius: 10 }} />
            </Card>
            <Card title="Category Breakdown" subtitle="Top categories">
              <div className="Skeleton" style={{ height: 220, borderRadius: 10 }} />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <Card title="Recent Activity" subtitle="Loading…">
            <SkeletonTable rows={5} columns={4} />
          </Card>
        </>
      ) : summaryState.error ? (
        <ErrorState
          title="Couldn't load dashboard data"
          message={summaryState.error}
          onRetry={refreshAll}
          retryLabel="Retry"
        />
      ) : !kpis ? (
        <EmptyState
          title="No data to show yet"
          message="There are no transactions available for this workspace. If Supabase is configured, seed data or insert a transaction to get started."
          ctaLabel="Reload"
          onCta={refreshAll}
        />
      ) : (
        <>
          <div className="Grid GridCols3">
            <MetricCard title="This Month" subtitle="Total spend" value={kpis.thisMonthSpend} trendPercent={72} />
            <MetricCard title="Budget Health" subtitle="Remaining" value={kpis.budgetRemaining} trendPercent={48} />
            <MetricCard title="Savings" subtitle="vs. forecast" value={kpis.savings} trendPercent={64} />
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols2">
            <Card title="Spending Trend" subtitle="Last 30 days">
              <LineChartPlaceholder title="Spending Trend" subtitle="Chart placeholder (data wired soon)" />
            </Card>

            <Card title="Category Breakdown" subtitle="Top categories">
              <PieChartPlaceholder title="Category Breakdown" subtitle="Chart placeholder (data wired soon)" />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <Card
            title="Recent Activity"
            subtitle={recentState.loading ? "Loading…" : "Latest transactions from Supabase"}
            actions={
              <button className="Button" type="button" onClick={refreshRecent} disabled={recentState.loading}>
                Refresh
              </button>
            }
          >
            {recentState.loading ? (
              <SkeletonTable rows={5} columns={4} />
            ) : recentState.error ? (
              <ErrorState title="Couldn't load recent activity" message={recentState.error} onRetry={refreshRecent} />
            ) : !recentState.data?.length ? (
              <EmptyState
                title="No recent transactions"
                message="Once transactions are inserted, they'll appear here automatically. Realtime is enabled when Supabase is configured."
                ctaLabel="Reload"
                onCta={refreshRecent}
              />
            ) : (
              <table className="Table" aria-label="Recent transactions">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentState.data.map((t) => (
                    <tr key={t.id}>
                      <td>{t.merchant}</td>
                      <td>{t.category}</td>
                      <td>{formatAmount(t.amount)}</td>
                      <td>
                        <span className={`Pill ${statusPillClass(t.status)}`}>{t.status || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
