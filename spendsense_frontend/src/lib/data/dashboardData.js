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
import { getAuthenticatedUserId } from "../../auth/userContext";

// PUBLIC_INTERFACE
export async function fetchDashboardSummary() {
  /** Fetch dashboard KPI summary via Supabase (transactions table). Prefers authenticated user when present. */
  const userId = await getAuthenticatedUserId();
  return fetchDashboardSummaryFromSupabase({ userId, allowDemoUser: true });
}

// PUBLIC_INTERFACE
export async function fetchInsightsSummary({ timeRange, segment }) {
  /** Fetch insights summary via Supabase for timeRange/segment context. Prefers authenticated user when present. */
  const userId = await getAuthenticatedUserId();
  return fetchInsightsSummaryFromSupabase({ userId, timeRange, segment, allowDemoUser: true });
}

// PUBLIC_INTERFACE
export async function fetchTransactionsSummary(filters = {}) {
  /** Fetch transactions summary via Supabase, using current filters (where applicable). Prefers authenticated user when present. */
  const userId = await getAuthenticatedUserId();
  return fetchTransactionsSummaryFromSupabase({ userId, filters, allowDemoUser: true });
}
