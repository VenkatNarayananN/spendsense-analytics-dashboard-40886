/**
 * Data fetch functions used by pages.
 * Previously placeholders; now backed by Supabase (env-driven client).
 *
 * Note: functions remain easily switchable to "no auth" or "demo user" mode.
 */
import {
  fetchDashboardSummaryFromSupabase,
  fetchInsightsSummaryFromSupabase,
  fetchTransactionsSummaryFromSupabase
} from "./supabaseQueries";

// PUBLIC_INTERFACE
export async function fetchDashboardSummary() {
  /** Fetch dashboard KPI summary via Supabase (transactions table). */
  return fetchDashboardSummaryFromSupabase({ allowDemoUser: true });
}

// PUBLIC_INTERFACE
export async function fetchInsightsSummary({ timeRange, segment }) {
  /** Fetch insights summary via Supabase for timeRange/segment context. */
  return fetchInsightsSummaryFromSupabase({ timeRange, segment, allowDemoUser: true });
}

// PUBLIC_INTERFACE
export async function fetchTransactionsSummary(filters = {}) {
  /** Fetch transactions summary via Supabase, using current filters (where applicable). */
  return fetchTransactionsSummaryFromSupabase({ filters, allowDemoUser: true });
}
