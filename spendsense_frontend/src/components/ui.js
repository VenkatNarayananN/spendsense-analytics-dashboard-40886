import React from "react";
import "../App.css";

// PUBLIC_INTERFACE
export function Card({ title, subtitle, actions, children }) {
  /** Generic card container with optional header. */
  return (
    <section className="Card">
      {(title || subtitle || actions) && (
        <header className="CardHeader">
          <div className="CardTitle">
            {title && <strong>{title}</strong>}
            {subtitle && <span>{subtitle}</span>}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

// PUBLIC_INTERFACE
export function MetricCard({ title, subtitle, value, trendPercent }) {
  /** Compact KPI card with a small trend bar. trendPercent: 0-100. */
  const safeTrend = Math.max(0, Math.min(100, Number.isFinite(trendPercent) ? trendPercent : 60));
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="Metric">{value}</div>
      <div className="MiniTrend" style={{ "--trend": `${safeTrend}%` }} aria-hidden="true" />
    </Card>
  );
}

// PUBLIC_INTERFACE
export function PlaceholderChart({ label = "Chart placeholder" }) {
  /** Visual placeholder representing a future chart component. */
  return <div className="PlaceholderChart">{label}</div>;
}
