import React from "react";
import { Card, MetricCard } from "../components/ui";
import { LineChartPlaceholder, PieChartPlaceholder } from "../components/charts/ChartPlaceholders";

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard page: KPIs + charts + recent activity placeholders. */
  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Dashboard</h2>
          <p>Key metrics, trends, and quick signals across your spending.</p>
        </div>
        <span className="Badge" aria-label="Data freshness">
          <span aria-hidden="true">⏱️</span> Updated just now
        </span>
      </div>

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
              <td><span className="Pill PillSuccess">Cleared</span></td>
            </tr>
            <tr>
              <td>Cloud Transit</td>
              <td>Transport</td>
              <td>-$42.00</td>
              <td><span className="Pill PillWarn">Pending</span></td>
            </tr>
            <tr>
              <td>Rose Market</td>
              <td>Groceries</td>
              <td>-$96.72</td>
              <td><span className="Pill PillSuccess">Cleared</span></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
