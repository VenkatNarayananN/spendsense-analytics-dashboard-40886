/**
 * Typed SpendSense backend client (TypeScript-compatible via JSDoc typedefs).
 *
 * - Uses existing fetch-based transport (src/lib/http/apiClient.js) through src/lib/http (apiClient export)
 * - Reads base URL from env helper (REACT_APP_API_BASE)
 * - Forwards Supabase JWT automatically via apiClient's onRequest hook
 * - Provides a safe fallback: if REACT_APP_API_BASE is missing, returns null so callers can use direct Supabase queries.
 *
 * IMPORTANT:
 * Backend endpoints are exposed by spendsense_backend and require Authorization: Bearer <supabase_jwt>
 */

import { getEnv } from "../env";
import { apiClient } from "../http";

/**
 * ---------------------------
 * DTO / Type definitions
 * ---------------------------
 */

/**
 * @typedef {Object} AnalyticsSummaryKpis
 * @property {number} incomeTotal
 * @property {number} expenseTotal
 * @property {number} netTotal
 * @property {number} transactionCount
 * @property {number} avgExpense
 * @property {string|null} [topCategory]
 * @property {number|null} [topCategoryTotal]
 */

/**
 * @typedef {Object} DateRangeDto
 * @property {string} from ISO datetime
 * @property {string} to ISO datetime
 */

/**
 * @typedef {Object} AnalyticsSummary
 * @property {string} currency
 * @property {DateRangeDto} range
 * @property {AnalyticsSummaryKpis} kpis
 */

/**
 * @typedef {Object} CategoryTotal
 * @property {string} categoryId
 * @property {string} categoryName
 * @property {number} totalExpense
 * @property {number} transactionCount
 */

/**
 * @typedef {Object} CategoryTotals
 * @property {string} currency
 * @property {DateRangeDto} range
 * @property {CategoryTotal[]} categories
 */

/**
 * @typedef {Object} TimeseriesPoint
 * @property {string} bucketStart ISO datetime
 * @property {number} incomeTotal
 * @property {number} expenseTotal
 * @property {number} transactionCount
 */

/**
 * @typedef {"day"|"week"|"month"} TimeseriesInterval
 */

/**
 * @typedef {Object} TimeseriesResponse
 * @property {string} currency
 * @property {TimeseriesInterval} interval
 * @property {DateRangeDto} range
 * @property {TimeseriesPoint[]} points
 */

/**
 * @typedef {Object} RecentTransaction
 * @property {string} id
 * @property {string} occurredAt ISO datetime
 * @property {string|null} postedAt ISO datetime
 * @property {"expense"|"income"|"transfer"} type
 * @property {"pending"|"cleared"|"void"} status
 * @property {number} amount Normalized amount (backend currency field)
 * @property {string} currency
 * @property {string|null} merchant
 * @property {string|null} description
 * @property {string|null} memo
 * @property {string|null} categoryId
 * @property {string|null} categoryName
 */

/**
 * @typedef {Object} RecentTransactionsResponse
 * @property {string} currency
 * @property {RecentTransaction[]} items
 */

/**
 * @typedef {Object} AlertsSummaryRules
 * @property {number} total
 * @property {number} active
 */

/**
 * @typedef {Object} AlertsSummaryTriggered
 * @property {number} total
 * @property {number} active
 * @property {Record<string, number>} activeBySeverity
 */

/**
 * @typedef {Object} AlertsSummary
 * @property {string} currency
 * @property {AlertsSummaryRules} rules
 * @property {AlertsSummaryTriggered} triggered
 * @property {number} resolvedTotal
 */

/**
 * @typedef {Object} UploadRowError
 * @property {number} rowNumber
 * @property {string[]} errors
 */

/**
 * @typedef {Object} UploadResponse
 * @property {string} upload_id
 * @property {number} inserted
 * @property {number} skipped_duplicates
 * @property {number} invalid
 * @property {UploadRowError[]} errors
 */

/**
 * @typedef {Object} BackendClient
 * @property {{summary: (params?: {from?: string, to?: string}) => Promise<AnalyticsSummary>, categories: (params?: {from?: string, to?: string}) => Promise<CategoryTotals>, timeseries: (params?: {interval?: TimeseriesInterval, from?: string, to?: string}) => Promise<TimeseriesResponse>}} analytics
 * @property {{summary: () => Promise<AlertsSummary>}} alerts
 * @property {{recent: (params?: {limit?: number}) => Promise<RecentTransactionsResponse>, uploadCSV: (file: File) => Promise<UploadResponse>}} transactions
 */

/**
 * Create a query string from optional params.
 * Keeps this file dependency-free (no qs).
 */
function toQuery(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v != null && String(v).trim() !== "");
  if (!entries.length) return "";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `?${qs}`;
}

function pickApiBaseOrNull() {
  const env = getEnv();
  const base = String(env.REACT_APP_API_BASE || "").trim();

  // Requirement: if missing, keep existing Supabase direct path as fallback.
  if (!base) return null;

  // base is set; apiClient already bound to it (src/lib/http/index.js uses REACT_APP_API_BASE).
  return base;
}

/**
 * PUBLIC_INTERFACE
 * Returns a typed client when REACT_APP_API_BASE is configured, otherwise null.
 * Callers should fallback to direct Supabase queries when this returns null.
 *
 * @returns {BackendClient|null}
 */
export function getBackendClient() {
  /** Create a typed backend client for SpendSense endpoints. */
  const base = pickApiBaseOrNull();
  if (!base) return null;

  return {
    analytics: {
      // PUBLIC_INTERFACE
      summary: async (params = {}) => {
        /** Get KPI summary totals for the authenticated user. */
        return apiClient.get(`/api/analytics/summary${toQuery(params)}`);
      },
      // PUBLIC_INTERFACE
      categories: async (params = {}) => {
        /** Get expense totals grouped by category. */
        return apiClient.get(`/api/analytics/categories${toQuery(params)}`);
      },
      // PUBLIC_INTERFACE
      timeseries: async (params = {}) => {
        /** Get time-series totals aggregated by interval. */
        return apiClient.get(`/api/analytics/timeseries${toQuery(params)}`);
      }
    },
    alerts: {
      // PUBLIC_INTERFACE
      summary: async () => {
        /** Get alerts summary for the authenticated user. */
        return apiClient.get(`/api/alerts/summary`);
      }
    },
    transactions: {
      // PUBLIC_INTERFACE
      recent: async (params = {}) => {
        /** Get recent transactions for the authenticated user. */
        return apiClient.get(`/api/transactions/recent${toQuery(params)}`);
      },
      // PUBLIC_INTERFACE
      uploadCSV: async (file) => {
        /** Upload a CSV file (multipart/form-data field name "file") to import transactions. */
        const fd = new FormData();
        fd.append("file", file);

        // Let browser set boundary; do not set content-type manually.
        return apiClient.post(
          `/api/transactions/upload`,
          fd,
          {
            headers: {
              accept: "application/json"
            }
          },
          // Upload should not retry automatically because it's non-idempotent.
          { maxRetries: 0, timeoutMs: 60_000 }
        );
      }
    }
  };
}
