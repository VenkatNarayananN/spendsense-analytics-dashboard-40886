/**
 * Centralized placeholder data-fetch functions.
 * TODO: Replace these with real Supabase queries (or backend API calls) once wired.
 */

/** Simulate a short network delay to make refresh signals observable during development. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// PUBLIC_INTERFACE
export async function fetchDashboardSummary() {
  /** Fetch dashboard KPI summary (placeholder). Replace with real query logic. */
  // TODO: supabase.from("transactions").select(...) aggregation
  await sleep(150);
  return {
    thisMonthSpend: "$3,482.10",
    budgetRemaining: "$1,217.90",
    savings: "+$164.00",
    freshnessLabel: "Updated just now"
  };
}

// PUBLIC_INTERFACE
export async function fetchInsightsSummary({ timeRange, segment }) {
  /** Fetch insights summary for selected timeRange/segment (placeholder). Replace with real query logic. */
  // TODO: derive aggregations by timeRange/segment
  await sleep(150);
  return {
    timeRange,
    segment,
    freshnessLabel: "Updated just now"
  };
}

// PUBLIC_INTERFACE
export async function fetchTransactionsSummary() {
  /** Fetch transactions summary (placeholder). Replace with real query logic. */
  // TODO: derive filtered totals/averages
  await sleep(150);
  return {
    totalSpendFiltered: "$1,204.33",
    averageTransaction: "$24.09"
  };
}
