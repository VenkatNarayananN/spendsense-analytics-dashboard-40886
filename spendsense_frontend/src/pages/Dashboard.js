import React, { useState } from "react";
import { Card, MetricCard } from "../components/ui";
import { LineChartPlaceholder, PieChartPlaceholder } from "../components/charts/ChartPlaceholders";
import { EmptyState, ErrorState, SkeletonCard, SkeletonTable } from "../components/ux";

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard page: KPIs + charts + recent activity placeholders with robust UX states (local state only). */

  // Demo-only UI state toggles (no backend fetch yet).
  const [uiState, setUiState] = useState("ready"); // "loading" | "empty" | "error" | "ready"

  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Dashboard</h2>
          <p>Key metrics, trends, and quick signals across your spending.</p>
        </div>
        <span className="Badge" aria-label="Data freshness">
          <span aria-hidden="true">⏱️</span> {uiState === "ready" ? "Updated just now" : `State: ${uiState}`}
        </span>
      </div>

      <div className="Card" style={{ marginBottom: 14 }}>
        <div className="CardHeader" style={{ marginBottom: 8 }}>
          <div className="CardTitle">
            <strong>Demo controls</strong>
            <span>Toggle loading/empty/error placeholders (UI only)</span>
          </div>
          <select className="Select" value={uiState} onChange={(e) => setUiState(e.target.value)} aria-label="Demo state">
            <option value="ready">Ready</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          This dashboard uses skeleton loaders and empty/error states to model real data fetching later.
        </div>
      </div>

      {uiState === "loading" ? (
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
      ) : uiState === "error" ? (
        <ErrorState
          title="Couldn't load dashboard data"
          message="This is a UI-only error placeholder. Hook up retries when you add real API calls."
          onRetry={() => setUiState("ready")}
        />
      ) : uiState === "empty" ? (
        <EmptyState
          title="No data to show yet"
          message="Connect a data source or adjust filters once transaction syncing is enabled."
          ctaLabel="Set to Ready"
          onCta={() => setUiState("ready")}
          secondaryLabel="Learn more (placeholder)"
          onSecondary={() => setUiState("ready")}
        />
      ) : (
        <>
          <div className="Grid GridCols3">
            <MetricCard title="This Month" subtitle="Total spend" value="$3,482.10" trendPercent={72} />
            <MetricCard title="Budget Health" subtitle="Remaining" value="$1,217.90" trendPercent={48} />
            <MetricCard title="Savings" subtitle="vs. last month" value="+$164.00" trendPercent={64} />
          </div>

          <div style={{ height: 14 }} />

          <div className="Grid GridCols2">
            <Card title="Spending Trend" subtitle="Last 30 days">
              <LineChartPlaceholder title="Spending Trend" subtitle="Line/area chart placeholder" />
            </Card>

            <Card title="Category Breakdown" subtitle="Top categories">
              <PieChartPlaceholder title="Category Breakdown" subtitle="Donut/pie chart placeholder" />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <Card
            title="Recent Activity"
            subtitle="A small snapshot of your latest transactions"
            actions={<button className="Button" type="button">View all</button>}
          >
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
                <tr>
                  <td>Ocean Café</td>
                  <td>Dining</td>
                  <td>-$18.40</td>
                  <td>
                    <span className="Pill PillSuccess">Cleared</span>
                  </td>
                </tr>
                <tr>
                  <td>Cloud Transit</td>
                  <td>Transport</td>
                  <td>-$42.00</td>
                  <td>
                    <span className="Pill PillWarn">Pending</span>
                  </td>
                </tr>
                <tr>
                  <td>Rose Market</td>
                  <td>Groceries</td>
                  <td>-$96.72</td>
                  <td>
                    <span className="Pill PillSuccess">Cleared</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
