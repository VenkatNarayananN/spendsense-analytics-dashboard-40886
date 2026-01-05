import React from "react";
import { Card } from "../components/ui";
import { BarChartPlaceholder, LineChartPlaceholder } from "../components/charts/ChartPlaceholders";

// PUBLIC_INTERFACE
export default function Insights() {
  /** Insights page: analytics highlights + charts placeholders. */
  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Insights</h2>
          <p>Highlights that help you understand patterns and optimize spending.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">✨</span> 3 new insights
        </span>
      </div>

      <div className="Grid GridCols2">
        <Card
          title="Top Drivers"
          subtitle="What influenced spend this month"
          actions={<button className="Button" type="button">Export</button>}
        >
          <BarChartPlaceholder title="Top Drivers" subtitle="Stacked bar chart placeholder" />
        </Card>

        <Card title="Merchant Concentration" subtitle="Where you spend most often">
          <LineChartPlaceholder title="Merchant Concentration" subtitle="Ranked list / treemap placeholder" />
        </Card>
      </div>

      <div style={{ height: 14 }} />

      <div className="Grid GridCols3">
        <Card title="Opportunity" subtitle="Small optimizations">
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Consider consolidating subscriptions; 4 services overlap in weekly usage patterns.
          </p>
        </Card>
        <Card title="Trend" subtitle="Category moving up">
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Dining spend is up 12% compared to last month, mostly on weekdays.
          </p>
        </Card>
        <Card title="Signal" subtitle="Unusual spike detected">
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Transport spend peaked on the 2nd; review for outliers or reimbursements.
          </p>
        </Card>
      </div>
    </>
  );
}
