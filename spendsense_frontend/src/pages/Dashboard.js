import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, MetricCard } from "../components/ui";
import { LineChartPlaceholder, PieChartPlaceholder } from "../components/charts/ChartPlaceholders";
import { EmptyState, ErrorState, SkeletonCard, SkeletonTable } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { fetchDashboardSummary } from "../lib/data/dashboardData";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";
import { fetchRecentTransactionsFromSupabase } from "../lib/data/supabaseQueries";
import { getAuthenticatedUserId } from "../auth/userContext";
import { formatWithOriginal } from "../lib/fx/openExchangeRates";

function statusPillClass(status) {
  if (status === "cleared") return "PillSuccess";
  if (status === "pending") return "PillWarn";
  if (status === "void") return "PillError";
  return "";
}

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard page: loads KPI + recent activity from Supabase; normalizes to USD; refreshes on realtime transaction INSERTs. */

  const [summaryState, setSummaryState] = useState({ loading: true, error: null, data: null });
  const [recentState, setRecentState] = useState({ loading: true, error: null, data: [], fx: null });

  // Non-blocking notices: realtime + FX fallback warning.
  const [fxNotice, setFxNotice] = useState(null);

  const refreshSummary = useCallback(async () => {
    try {
      setSummaryState((p) => ({ ...p, loading: true, error: null }));
      const next = await fetchDashboardSummary();
      setSummaryState({ loading: false, error: null, data: next });

      if (next?.fx?.usedFallback && next?.fx?.warning) setFxNotice(next.fx.warning);
    } catch (e) {
      setSummaryState({ loading: false, error: e?.message || String(e), data: null });
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      setRecentState((p) => ({ ...p, loading: true, error: null }));
      const userId = await getAuthenticatedUserId();
      const res = await fetchRecentTransactionsFromSupabase({ userId, allowDemoUser: true, limit: 6 });
      setRecentState({ loading: false, error: null, data: res.rows || [], fx: res.fx || null });

      if (res?.fx?.usedFallback && res?.fx?.warning) setFxNotice(res.fx.warning);
    } catch (e) {
      setRecentState({ loading: false, error: e?.message || String(e), data: [], fx: null });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshRecent()]);
  }, [refreshRecent, refreshSummary]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-clear FX notice after a while (non-blocking).
  useEffect(() => {
    if (!fxNotice) return undefined;
    const t = window.setTimeout(() => setFxNotice(null), 5200);
    return () => window.clearTimeout(t);
  }, [fxNotice]);

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
      <ToastNotice message={fxNotice || notice} />

      <div className="PageHeader">
        <div>
          <h2>Dashboard</h2>
          <p>Key metrics, trends, and quick signals across your spending (USD-normalized).</p>
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
            <MetricCard title="This Month" subtitle="Total spend (USD)" value={kpis.thisMonthSpend} trendPercent={72} />
            <MetricCard title="Budget Health" subtitle="Remaining (USD)" value={kpis.budgetRemaining} trendPercent={48} />
            <MetricCard title="Savings" subtitle="vs. forecast (USD)" value={kpis.savings} trendPercent={64} />
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols2">
            <Card title="Spending Trend" subtitle="Last 30 days (USD)">
              <LineChartPlaceholder title="Spending Trend" subtitle="Chart placeholder (USD-normalized soon)" />
            </Card>

            <Card title="Category Breakdown" subtitle="Top categories (USD)">
              <PieChartPlaceholder title="Category Breakdown" subtitle="Chart placeholder (USD-normalized soon)" />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <Card
            title="Recent Activity"
            subtitle={recentState.loading ? "Loading…" : "Latest transactions from Supabase (USD-normalized)"}
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
                    <th>Amount (USD)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentState.data.map((t) => {
                    const fmt = formatWithOriginal({
                      amountUsd: t.amount_usd,
                      originalAmount: t.original_amount,
                      originalCurrency: t.currency
                    });

                    return (
                      <tr key={t.id}>
                        <td>{t.merchant}</td>
                        <td>{t.category}</td>
                        <td title={fmt.title}>{fmt.text}</td>
                        <td>
                          <span className={`Pill ${statusPillClass(t.status)}`}>{t.status || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
