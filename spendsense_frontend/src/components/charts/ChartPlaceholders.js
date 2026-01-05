import React from "react";
import "../../App.css";

/**
 * These are presentational placeholders only (no chart library dependency).
 * Swap these out later with real chart components (e.g., Recharts, Visx, Chart.js).
 */

function BaseChartPlaceholder({ title, subtitle, icon, height = 220 }) {
  return (
    <div className="ChartPlaceholder" style={{ height }} role="img" aria-label={`${title} chart placeholder`}>
      <div className="ChartPlaceholderInner">
        <div className="ChartPlaceholderIcon" aria-hidden="true">
          {icon}
        </div>
        <div className="ChartPlaceholderText">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function LineChartPlaceholder({ title = "Line Chart", subtitle = "Time-series placeholder", height }) {
  /** Reusable line chart placeholder. */
  return <BaseChartPlaceholder title={title} subtitle={subtitle} icon="📈" height={height} />;
}

// PUBLIC_INTERFACE
export function BarChartPlaceholder({ title = "Bar Chart", subtitle = "Category comparison placeholder", height }) {
  /** Reusable bar chart placeholder. */
  return <BaseChartPlaceholder title={title} subtitle={subtitle} icon="📊" height={height} />;
}

// PUBLIC_INTERFACE
export function PieChartPlaceholder({ title = "Pie Chart", subtitle = "Distribution placeholder", height }) {
  /** Reusable pie/donut chart placeholder. */
  return <BaseChartPlaceholder title={title} subtitle={subtitle} icon="🥧" height={height} />;
}
