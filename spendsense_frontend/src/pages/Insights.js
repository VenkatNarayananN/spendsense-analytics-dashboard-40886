import React, { useCallback, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { BarChartPlaceholder, LineChartPlaceholder } from "../components/charts/ChartPlaceholders";
import { EmptyState, ErrorState, SegmentedControl, SkeletonCard } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { fetchInsightsSummary } from "../lib/data/dashboardData";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";

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
  /** Insights page: time-range + segment controls and robust UX states (local state only). */

  const [timeRange, setTimeRange] = useState("30d");
  const [segment, setSegment] = useState("Category");

  // Demo-only UI states (no real fetch yet).
  const [uiState, setUiState] = useState("ready"); // "loading" | "empty" | "error" | "ready"

  const [freshnessLabel, setFreshnessLabel] = useState("Updated just now");

  const context = useMemo(() => {
    const rangeLabel = TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.label || timeRange;
    return {
      rangeLabel,
      segment
    };
  }, [timeRange, segment]);

  const refreshInsights = useCallback(async () => {
    try {
      const next = await fetchInsightsSummary({ timeRange, segment });
      setFreshnessLabel(next?.freshnessLabel || "Updated just now");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[SpendSense] Failed to refresh insights (placeholder).", e);
    }
  }, [segment, timeRange]);

  const { notice } = useTransactionsRealtime({
    onRefreshRequested: refreshInsights
  });

  return (
    <>
      <ToastNotice message={notice} />

      <div className="PageHeader">
        <div>
          <h2>Insights</h2>
          <p>Highlights that help you understand patterns and optimize spending.</p>
        </div>
        <span className="Badge" aria-label="Insights context">
          <span aria-hidden="true">✨</span> Time: {context.rangeLabel} • Segment: {context.segment} • {freshnessLabel}
        </span>
      </div>

      <div className="Card" style={{ marginBottom: 14 }}>
        <div className="CardHeader" style={{ marginBottom: 12 }}>
          <div className="CardTitle">
            <strong>Explore</strong>
            <span>Adjust the time range and segment (local state only)</span>
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

            <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Demo state</div>
              <select className="Select" value={uiState} onChange={(e) => setUiState(e.target.value)} aria-label="Demo state">
                <option value="ready">Ready</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Showing <strong>{context.segment}</strong> insights for <strong>{context.rangeLabel}</strong>. (Placeholder content)
        </div>
      </div>

      {uiState === "loading" ? (
        <div className="Grid GridCols2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : uiState === "error" ? (
        <ErrorState
          title="Couldn't load insights"
          message="This is a UI-only error placeholder. Wire up retry logic when backend fetching is added."
          onRetry={() => setUiState("ready")}
        />
      ) : uiState === "empty" ? (
        <EmptyState
          title="No insights available for this selection"
          message="Try a wider time range or switch the segment to see more signals."
          ctaLabel="Use 90d"
          onCta={() => {
            setTimeRange("90d");
            setUiState("ready");
          }}
          secondaryLabel="Switch segment"
          onSecondary={() => setSegment((s) => (s === "Category" ? "Merchant" : "Category"))}
        />
      ) : (
        <>
          <div className="Grid GridCols2">
            <Card
              title={`Top Drivers (${context.segment})`}
              subtitle={`What influenced spend • ${context.rangeLabel}`}
              actions={<button className="Button" type="button">Export</button>}
            >
              <BarChartPlaceholder
                title={`Top Drivers by ${context.segment}`}
                subtitle={`Placeholder • Range: ${context.rangeLabel}`}
              />
            </Card>

            <Card title={`${context.segment} Concentration`} subtitle={`Where you spend most often • ${context.rangeLabel}`}>
              <LineChartPlaceholder
                title={`${context.segment} Concentration`}
                subtitle={`Placeholder • Range: ${context.rangeLabel}`}
              />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols3">
            <Card title="Opportunity" subtitle={`Suggestions • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                Consider consolidating subscriptions; 4 services overlap in weekly usage patterns.
              </p>
            </Card>
            <Card title="Trend" subtitle={`${context.segment} moving up • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                Dining spend is up 12% compared to last month, mostly on weekdays.
              </p>
            </Card>
            <Card title="Signal" subtitle={`Unusual spike detected • ${context.rangeLabel}`}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                Transport spend peaked on the 2nd; review for outliers or reimbursements.
              </p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
