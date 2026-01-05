import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { BarChartPlaceholder, LineChartPlaceholder } from "../components/charts/ChartPlaceholders";
import { EmptyState, ErrorState, SegmentedControl, SkeletonCard } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { fetchInsightsSummary } from "../lib/data/dashboardData";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";
import { getBackendClient } from "../lib/api/backendClient";
import { formatMoneyUSD } from "../lib/fx/openExchangeRates";

const TIME_RANGE_OPTIONS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "YTD", label: "YTD" }
];

const SEGMENT_OPTIONS = [
  { value: "Category", label: "Category" },
  { value: "Merchant", label: "Merchant" }
];

// PUBLIC_INTERFACE
export default function Insights() {
  /** Insights page: Supabase-backed summary context + placeholders for charts; totals normalized to USD; refreshes on realtime transaction INSERTs. */

  const [timeRange, setTimeRange] = useState("30d");
  const [segment, setSegment] = useState("Category");

  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [fxNotice, setFxNotice] = useState(null);

  const context = useMemo(() => {
    const rangeLabel = TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.label || timeRange;
    return {
      rangeLabel,
      segment
    };
  }, [timeRange, segment]);

  const refreshInsights = useCallback(async () => {
    try {
      setState((p) => ({ ...p, loading: true, error: null }));

      const backend = getBackendClient();
      if (backend) {
        // Map timeRange -> backend date range (best-effort).
        const now = new Date();
        let start = null;

        if (timeRange === "7d") start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        else if (timeRange === "30d") start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        else if (timeRange === "90d") start = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
        else if (timeRange === "YTD") start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        else start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

        const summary = await backend.analytics.summary({ from: start.toISOString(), to: now.toISOString() });

        const spendUsd = Math.abs(Number(summary?.kpis?.expenseTotal ?? 0));
        const txCount = Number(summary?.kpis?.transactionCount ?? 0);

        setFxNotice(null);
        setState({
          loading: false,
          error: null,
          data: {
            timeRange,
            segment,
            freshnessLabel: "Live",
            totalSpend: formatMoneyUSD(spendUsd),
            txCount,
            fx: { usedFallback: false, warning: null }
          }
        });
        return;
      }

      const next = await fetchInsightsSummary({ timeRange, segment });
      setState({ loading: false, error: null, data: next });

      if (next?.fx?.usedFallback && next?.fx?.warning) setFxNotice(next.fx.warning);
    } catch (e) {
      setState({ loading: false, error: e?.message || String(e), data: null });
    }
  }, [segment, timeRange]);

  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  const { notice } = useTransactionsRealtime({
    onRefreshRequested: refreshInsights
  });

  // Auto-clear FX notice after a while (non-blocking).
  useEffect(() => {
    if (!fxNotice) return undefined;
    const t = window.setTimeout(() => setFxNotice(null), 5200);
    return () => window.clearTimeout(t);
  }, [fxNotice]);

  const badgeText = useMemo(() => {
    if (state.loading) return `Time: ${context.rangeLabel} • Segment: ${context.segment} • Loading…`;
    if (state.error) return `Time: ${context.rangeLabel} • Segment: ${context.segment} • Error`;
    const d = state.data;
    const extra = d ? `• Total (USD): ${d.totalSpend} • Tx: ${d.txCount}` : "";
    return `Time: ${context.rangeLabel} • Segment: ${context.segment} • ${d?.freshnessLabel || "Live"} ${extra}`;
  }, [context, state]);

  return (
    <>
      <ToastNotice message={fxNotice || notice} />

      <div className="PageHeader">
        <div>
          <h2>Insights</h2>
          <p>Highlights that help you understand patterns and optimize spending (USD-normalized).</p>
        </div>
        <span className="Badge" aria-label="Insights context">
          <span aria-hidden="true">✨</span> {badgeText}
        </span>
      </div>

      <div className="Card" style={{ marginBottom: 14 }}>
        <div className="CardHeader" style={{ marginBottom: 12 }}>
          <div className="CardTitle">
            <strong>Explore</strong>
            <span>Time range and segment control (live summary)</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Time range</div>
              <SegmentedControl options={TIME_RANGE_OPTIONS} value={timeRange} onChange={setTimeRange} ariaLabel="Time range" />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Segment</div>
              <SegmentedControl options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} ariaLabel="Segment" />
            </div>

            <button className="Button ButtonPrimary" type="button" onClick={refreshInsights} disabled={state.loading}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Showing <strong>{context.segment}</strong> insights for <strong>{context.rangeLabel}</strong>. Totals are normalized to{" "}
          <strong>USD</strong>.
        </div>
      </div>

      {state.loading ? (
        <div className="Grid GridCols2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : state.error ? (
        <ErrorState title="Couldn't load insights" message={state.error} onRetry={refreshInsights} />
      ) : !state.data || (state.data.txCount || 0) === 0 ? (
        <EmptyState
          title="No insights available for this selection"
          message="There are no transactions in the selected time range. Try widening the range or insert new transactions in Supabase."
          ctaLabel="Use 90d"
          onCta={() => setTimeRange("90d")}
          secondaryLabel="Reload"
          onSecondary={refreshInsights}
        />
      ) : (
        <>
          <div className="Grid GridCols2">
            <Card
              title={`Top Drivers (${context.segment})`}
              subtitle={`What influenced spend • ${context.rangeLabel}`}
              actions={
                <button className="Button" type="button" onClick={refreshInsights} disabled={state.loading}>
                  Refresh
                </button>
              }
            >
              <BarChartPlaceholder
                title={`Top Drivers by ${context.segment}`}
                subtitle={`Chart placeholder • Total (USD): ${state.data.totalSpend}`}
              />
            </Card>

            <Card title={`${context.segment} Concentration`} subtitle={`Where you spend most often • ${context.rangeLabel}`}>
              <LineChartPlaceholder
                title={`${context.segment} Concentration`}
                subtitle={`Chart placeholder • Tx count: ${state.data.txCount}`}
              />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols3">
            <Card title="Opportunity" subtitle={`Suggestions • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                With live data wired, the next step is to compute top categories/merchants and surface real recommendations (in USD).
              </p>
            </Card>
            <Card title="Trend" subtitle={`${context.segment} movement • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                This panel can be upgraded to show week-over-week comparisons once we add simple group-by queries or a view.
              </p>
            </Card>
            <Card title="Signal" subtitle={`Realtime-aware • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                When a transaction is inserted, insights automatically refresh via the existing realtime hook and re-compute USD totals.
              </p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
