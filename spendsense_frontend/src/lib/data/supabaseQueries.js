import { supabase } from "../supabaseClient";
import { convertToUSD, formatMoneyUSD, getFxRates } from "../fx/openExchangeRates";

/**
 * Data access helpers for SpendSense pages.
 * These functions are intentionally:
 * - RLS-friendly (scoped by user_id when provided)
 * - tolerant of "no auth yet" (userId optional)
 * - safe (no secrets in UI; uses env-driven supabaseClient)
 *
 * Currency normalization:
 * - We attempt to load OpenExchangeRates rates and compute `amount_usd`.
 * - Each transaction includes `currency` (best-effort; falls back to "USD").
 * - When rates are unavailable we fall back to last-good cached rates or skip conversion.
 */

const DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Normalize a value to a safe numeric type (or null).
 */
function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize a currency code.
 */
function normalizeCurrency(value) {
  const c = String(value || "USD").trim().toUpperCase();
  // Keep it simple; accept 3-letter codes.
  if (!c || c.length < 3) return "USD";
  return c.slice(0, 3);
}

/**
 * Normalize a string for ilike search (escape %/_).
 */
function escapeForILike(input) {
  return String(input || "").replace(/[%_]/g, "\\$&");
}

/**
 * Builds a date range lower/upper bound for `occurred_at` (timestamptz).
 * Uses local date inputs (YYYY-MM-DD) and converts to ISO boundaries.
 */
function buildOccurredAtBounds(dateRange) {
  const fromRaw = dateRange?.from ? new Date(dateRange.from) : null;
  const toRaw = dateRange?.to ? new Date(dateRange.to) : null;

  const from = fromRaw && !Number.isNaN(fromRaw.getTime()) ? new Date(fromRaw.setHours(0, 0, 0, 0)) : null;

  // Inclusive end-of-day bound for `to`.
  const to = toRaw && !Number.isNaN(toRaw.getTime()) ? new Date(toRaw.setHours(23, 59, 59, 999)) : null;

  return { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null };
}

/**
 * Extract month window bounds [startOfMonth, startOfNextMonth) in ISO.
 */
function getMonthBounds(reference = new Date()) {
  const d = new Date(reference);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start: start.toISOString(), end: next.toISOString() };
}

/**
 * Sum helper (numeric amounts can arrive as strings from Postgres).
 */
function sumAmounts(rows) {
  return (rows || []).reduce((acc, r) => acc + (toNumberOrNull(r?.amount) || 0), 0);
}

/**
 * Convert + sum in USD. Skips rows that cannot be converted.
 */
function sumAmountsUSD(rows, rates) {
  return (rows || []).reduce((acc, r) => {
    const amount = toNumberOrNull(r?.amount);
    if (!Number.isFinite(amount)) return acc;
    const currency = normalizeCurrency(r?.currency || r?.currency_code || "USD");
    const usd = convertToUSD({ amount, currency, rates });
    if (!Number.isFinite(usd)) return acc;
    return acc + usd;
  }, 0);
}

/**
 * Basic "trend percent" estimation purely for UI bar fill.
 * Keeps within 0..100 and provides a stable fallback.
 */
function deriveTrendPercent(value) {
  const n = Math.abs(toNumberOrNull(value) || 0);
  // Compress values into a 20..95 band for a pleasant UI fill.
  const pct = 20 + Math.min(75, Math.log10(n + 10) * 18);
  return Math.max(0, Math.min(100, pct));
}

/**
 * PUBLIC_INTERFACE
 */
export function getUserContext({ userId, allowDemoUser = true } = {}) {
  /** Return a user context usable for RLS-friendly queries; falls back to a demo UUID. */
  const uid = userId || (allowDemoUser ? DEFAULT_DEMO_USER_ID : null);
  return { userId: uid, isDemo: Boolean(!userId && allowDemoUser) };
}

/**
 * Ensures Supabase is configured; throws an Error otherwise.
 */
function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable data loading."
    );
  }
}

/**
 * Get rates once per query function call, relying on internal caching.
 */
async function getRatesForConversion() {
  const res = await getFxRates();
  return res;
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchDashboardSummaryFromSupabase({ userId, allowDemoUser = true } = {}) {
  /** Fetch KPI summary from Supabase transactions for current month (simple, auth-friendly), normalized to USD. */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });
  const { start, end } = getMonthBounds(new Date());

  let q = supabase
    .from("transactions")
    // currency column name may vary; request a few common options.
    .select("amount, type, occurred_at, currency, currency_code", { count: "exact" })
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  // When auth/RLS is enabled, scope by user_id.
  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const { data, error } = await q;
  if (error) throw error;

  const { rates, usedFallback, warning } = await getRatesForConversion();

  // Expenses are typically negative in seed data; normalize spend to positive.
  const totalUsd = rates ? sumAmountsUSD(data, rates) : sumAmounts(data);
  const spendUsd = Math.abs(totalUsd);

  // Placeholder "budget remaining" until we wire budgets table into the dashboard.
  // Keep this derived from spend to feel real and stable.
  const budgetLimit = Math.max(800, Math.round((spendUsd * 1.35 + 500) * 100) / 100);
  const remaining = Math.max(0, budgetLimit - spendUsd);

  // Savings is a soft signal; for now use a gentle fraction of remaining.
  const savings = Math.max(0, remaining * 0.12);

  return {
    // Keep existing string outputs, but now in USD-normalized terms.
    thisMonthSpend: formatMoneyUSD(spendUsd),
    budgetRemaining: formatMoneyUSD(remaining),
    savings: `+${formatMoneyUSD(savings)}`,
    freshnessLabel: ctx.isDemo ? "Live (demo user)" : "Live",
    // New: expose rates status for non-blocking UI notice.
    fx: {
      usedFallback: Boolean(usedFallback),
      warning: warning || null
    }
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchRecentTransactionsFromSupabase({ userId, allowDemoUser = true, limit = 5 } = {}) {
  /** Fetch most recent transactions for the dashboard "Recent Activity" table, including USD-normalized amounts. */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  let q = supabase
    .from("transactions")
    .select(
      `
      id,
      occurred_at,
      status,
      amount,
      currency,
      currency_code,
      merchant,
      description,
      memo,
      type,
      categories:category_id (
        id,
        name
      )
    `
    )
    .order("occurred_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));

  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const { data, error } = await q;
  if (error) throw error;

  const { rates, usedFallback, warning } = await getRatesForConversion();

  return {
    fx: { usedFallback: Boolean(usedFallback), warning: warning || null },
    rows: (data || []).map((row) => {
      const amount = toNumberOrNull(row.amount);
      const currency = normalizeCurrency(row.currency || row.currency_code || "USD");
      const amount_usd = rates ? convertToUSD({ amount, currency, rates }) : null;

      return {
        id: row.id,
        date: row.occurred_at,
        merchant: row.merchant || row.description || "—",
        category: row.categories?.name || "—",
        status: row.status,
        currency,
        original_amount: amount,
        amount_usd: Number.isFinite(amount_usd) ? amount_usd : amount
      };
    })
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchTransactionsPageFromSupabase({
  userId,
  allowDemoUser = true,
  page = 1,
  pageSize = 15,
  filters = {}
} = {}) {
  /**
   * Fetch paginated transactions with basic filters:
   * - dateRange (occurred_at gte/lte)
   * - categories (via join to categories + in by category_id)
   * - amountMin/amountMax (amount gte/lte) [NOTE: still applies to original amount field]
   * - search (merchant/description/memo/category name) via ilike
   *
   * Also returns `currency`, `original_amount`, and `amount_usd` (USD-normalized).
   */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  const safePageSize = Math.max(5, Math.min(50, Number(pageSize) || 15));
  const safePage = Math.max(1, Number(page) || 1);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let q = supabase
    .from("transactions")
    .select(
      `
      id,
      occurred_at,
      status,
      amount,
      currency,
      currency_code,
      merchant,
      description,
      memo,
      type,
      categories:category_id (
        id,
        name
      )
    `,
      { count: "exact" }
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const amountMin = toNumberOrNull(filters.amountMin);
  const amountMax = toNumberOrNull(filters.amountMax);
  if (Number.isFinite(amountMin)) q = q.gte("amount", amountMin);
  if (Number.isFinite(amountMax)) q = q.lte("amount", amountMax);

  const { from: fromIso, to: toIso } = buildOccurredAtBounds(filters.dateRange);
  if (fromIso) q = q.gte("occurred_at", fromIso);
  if (toIso) q = q.lte("occurred_at", toIso);

  // Categories: filter by category name → resolve IDs first (user scoped if possible)
  if (Array.isArray(filters.categories) && filters.categories.length > 0) {
    const names = filters.categories.map(String);
    let catQ = supabase.from("categories").select("id,name").in("name", names);
    if (ctx.userId) catQ = catQ.eq("user_id", ctx.userId);

    const { data: cats, error: catsErr } = await catQ;
    if (catsErr) throw catsErr;

    const ids = (cats || []).map((c) => c.id);
    // If user selected categories that don't exist, return empty fast.
    if (ids.length === 0) {
      return { rows: [], page: safePage, pageSize: safePageSize, total: 0, fx: { usedFallback: false, warning: null } };
    }
    q = q.in("category_id", ids);
  }

  // Search: OR across merchant/description/memo. Category name search needs join; we do a two-phase filter.
  const search = String(filters.search || "").trim();
  if (search) {
    const term = `%${escapeForILike(search)}%`;
    q = q.or(`merchant.ilike.${term},description.ilike.${term},memo.ilike.${term}`);
  }

  let { data, error, count } = await q;
  if (error) throw error;

  // Phase B category name fallback: if search exists and returned empty, try category name match.
  if (search && (!data || data.length === 0)) {
    let catLikeQ = supabase.from("categories").select("id").ilike("name", `%${escapeForILike(search)}%`);
    if (ctx.userId) catLikeQ = catLikeQ.eq("user_id", ctx.userId);
    const { data: catMatches, error: catLikeErr } = await catLikeQ;
    if (!catLikeErr && catMatches?.length) {
      const catIds = catMatches.map((c) => c.id);
      let q2 = supabase
        .from("transactions")
        .select(
          `
          id,
          occurred_at,
          status,
          amount,
          currency,
          currency_code,
          merchant,
          description,
          memo,
          type,
          categories:category_id (
            id,
            name
          )
        `,
          { count: "exact" }
        )
        .order("occurred_at", { ascending: false })
        .range(from, to)
        .in("category_id", catIds);

      if (ctx.userId) q2 = q2.eq("user_id", ctx.userId);

      if (Number.isFinite(amountMin)) q2 = q2.gte("amount", amountMin);
      if (Number.isFinite(amountMax)) q2 = q2.lte("amount", amountMax);
      if (fromIso) q2 = q2.gte("occurred_at", fromIso);
      if (toIso) q2 = q2.lte("occurred_at", toIso);

      const res2 = await q2;
      if (res2.error) throw res2.error;
      data = res2.data;
      count = res2.count;
    }
  }

  const { rates, usedFallback, warning } = await getRatesForConversion();

  return {
    rows: (data || []).map((row) => {
      const amount = toNumberOrNull(row.amount);
      const currency = normalizeCurrency(row.currency || row.currency_code || "USD");
      const amount_usd = rates ? convertToUSD({ amount, currency, rates }) : null;

      return {
        id: row.id,
        date: row.occurred_at,
        merchant: row.merchant || row.description || "—",
        category: row.categories?.name || "—",
        status: row.status,
        currency,
        original_amount: amount,
        amount_usd: Number.isFinite(amount_usd) ? amount_usd : amount
      };
    }),
    page: safePage,
    pageSize: safePageSize,
    total: count || 0,
    fx: { usedFallback: Boolean(usedFallback), warning: warning || null }
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchTransactionsSummaryFromSupabase({ userId, allowDemoUser = true, filters = {} } = {}) {
  /** Fetch a small summary for Transactions page (totals/avg) using current filters, normalized to USD. */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  let q = supabase.from("transactions").select("amount, currency, currency_code, occurred_at, merchant, description, memo", {
    count: "exact"
  });
  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const amountMin = toNumberOrNull(filters.amountMin);
  const amountMax = toNumberOrNull(filters.amountMax);
  if (Number.isFinite(amountMin)) q = q.gte("amount", amountMin);
  if (Number.isFinite(amountMax)) q = q.lte("amount", amountMax);

  const { from: fromIso, to: toIso } = buildOccurredAtBounds(filters.dateRange);
  if (fromIso) q = q.gte("occurred_at", fromIso);
  if (toIso) q = q.lte("occurred_at", toIso);

  const search = String(filters.search || "").trim();
  if (search) {
    const term = `%${escapeForILike(search)}%`;
    q = q.or(`merchant.ilike.${term},description.ilike.${term},memo.ilike.${term}`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const { rates, usedFallback, warning } = await getRatesForConversion();

  const totalUsd = rates ? sumAmountsUSD(data, rates) : sumAmounts(data);
  const spendUsd = Math.abs(totalUsd);
  const avgUsd = data?.length ? spendUsd / data.length : 0;

  return {
    totalSpendFiltered: formatMoneyUSD(spendUsd),
    averageTransaction: formatMoneyUSD(avgUsd),
    trendPercent: deriveTrendPercent(spendUsd),
    fx: { usedFallback: Boolean(usedFallback), warning: warning || null }
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchInsightsSummaryFromSupabase({ userId, allowDemoUser = true, timeRange = "30d", segment = "Category" } = {}) {
  /** Fetch a lightweight insights summary; chart components remain placeholders but show real context + totals (USD-normalized). */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  const now = new Date();
  let start = null;

  if (timeRange === "7d") start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  else if (timeRange === "30d") start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  else if (timeRange === "90d") start = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  else if (timeRange === "YTD") start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
  else start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  let q = supabase
    .from("transactions")
    .select("amount, currency, currency_code, occurred_at, category_id", { count: "exact" })
    .gte("occurred_at", start.toISOString());

  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const { data, error } = await q;
  if (error) throw error;

  const { rates, usedFallback, warning } = await getRatesForConversion();

  const totalUsd = rates ? sumAmountsUSD(data, rates) : sumAmounts(data);
  const spendUsd = Math.abs(totalUsd);

  return {
    timeRange,
    segment,
    freshnessLabel: ctx.isDemo ? "Live (demo user)" : "Live",
    totalSpend: formatMoneyUSD(spendUsd),
    txCount: data?.length || 0,
    fx: { usedFallback: Boolean(usedFallback), warning: warning || null }
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchAlertsFromSupabase({ userId, allowDemoUser = true, status = "all", severity = "all", limit = 25 } = {}) {
  /** Fetch alerts (rules + triggered) with basic status/severity filters. */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  let q = supabase
    .from("alerts")
    .select("id, kind, status, severity, title, message, triggered_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)));

  if (ctx.userId) q = q.eq("user_id", ctx.userId);
  if (status && status !== "all") q = q.eq("status", status);
  if (severity && severity !== "all") q = q.eq("severity", severity);

  const { data, error } = await q;
  if (error) throw error;

  return data || [];
}
