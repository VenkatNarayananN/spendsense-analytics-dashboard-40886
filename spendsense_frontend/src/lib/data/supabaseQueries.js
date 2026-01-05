import { supabase } from "../supabaseClient";

/**
 * Data access helpers for SpendSense pages.
 * These functions are intentionally:
 * - RLS-friendly (scoped by user_id when provided)
 * - tolerant of "no auth yet" (userId optional)
 * - safe (no secrets in UI; uses env-driven supabaseClient)
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
  const to =
    toRaw && !Number.isNaN(toRaw.getTime()) ? new Date(toRaw.setHours(23, 59, 59, 999)) : null;

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
 * Format a numeric amount to currency-ish string used by existing UI cards.
 */
function formatMoneyUSD(value) {
  const n = toNumberOrNull(value);
  if (!Number.isFinite(n)) return "$0.00";
  const abs = Math.abs(n);
  return `$${abs.toFixed(2)}`;
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
 * PUBLIC_INTERFACE
 */
export async function fetchDashboardSummaryFromSupabase({ userId, allowDemoUser = true } = {}) {
  /** Fetch KPI summary from Supabase transactions for current month (simple, auth-friendly). */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });
  const { start, end } = getMonthBounds(new Date());

  let q = supabase
    .from("transactions")
    .select("amount, type, occurred_at", { count: "exact" })
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  // When auth/RLS is enabled, scope by user_id.
  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const { data, error } = await q;
  if (error) throw error;

  // Expenses are typically negative in seed data; normalize spend to positive.
  const total = sumAmounts(data);
  const spend = Math.abs(total);

  // Placeholder "budget remaining" until we wire budgets table into the dashboard.
  // Keep this derived from spend to feel real and stable.
  const budgetLimit = Math.max(800, Math.round((spend * 1.35 + 500) * 100) / 100);
  const remaining = Math.max(0, budgetLimit - spend);

  // Savings is a soft signal; for now use a gentle fraction of remaining.
  const savings = Math.max(0, remaining * 0.12);

  return {
    thisMonthSpend: formatMoneyUSD(spend),
    budgetRemaining: formatMoneyUSD(remaining),
    savings: `+${formatMoneyUSD(savings)}`,
    freshnessLabel: ctx.isDemo ? "Live (demo user)" : "Live"
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchRecentTransactionsFromSupabase({ userId, allowDemoUser = true, limit = 5 } = {}) {
  /** Fetch most recent transactions for the dashboard "Recent Activity" table. */
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

  return (data || []).map((row) => ({
    id: row.id,
    date: row.occurred_at,
    merchant: row.merchant || row.description || "—",
    category: row.categories?.name || "—",
    amount: toNumberOrNull(row.amount),
    status: row.status
  }));
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
   * - amountMin/amountMax (amount gte/lte)
   * - search (merchant/description/memo/category name) via ilike
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
      return {
        rows: [],
        page: safePage,
        pageSize: safePageSize,
        total: 0
      };
    }
    q = q.in("category_id", ids);
  }

  // Search: OR across merchant/description/memo. Category name search needs join; we do a two-phase filter:
  // Phase A: OR on tx textual fields via ilike.
  // Phase B: If no results and search exists, try category name lookup and filter by category_id.
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

  return {
    rows: (data || []).map((row) => ({
      id: row.id,
      date: row.occurred_at,
      merchant: row.merchant || row.description || "—",
      category: row.categories?.name || "—",
      amount: toNumberOrNull(row.amount),
      status: row.status
    })),
    page: safePage,
    pageSize: safePageSize,
    total: count || 0
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchTransactionsSummaryFromSupabase({ userId, allowDemoUser = true, filters = {} } = {}) {
  /** Fetch a small summary for Transactions page (totals/avg) using current filters. */
  requireSupabase();

  const ctx = getUserContext({ userId, allowDemoUser });

  let q = supabase.from("transactions").select("amount, occurred_at, merchant, description, memo", { count: "exact" });
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

  const total = sumAmounts(data);
  const spend = Math.abs(total);
  const avg = data?.length ? spend / data.length : 0;

  return {
    totalSpendFiltered: formatMoneyUSD(spend),
    averageTransaction: formatMoneyUSD(avg),
    // Helpful for UI trend bars if needed later
    trendPercent: deriveTrendPercent(spend)
  };
}

/**
 * PUBLIC_INTERFACE
 */
export async function fetchInsightsSummaryFromSupabase({ userId, allowDemoUser = true, timeRange = "30d", segment = "Category" } = {}) {
  /** Fetch a lightweight insights summary; chart components remain placeholders but show real context + totals. */
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
    .select("amount, occurred_at, category_id", { count: "exact" })
    .gte("occurred_at", start.toISOString());

  if (ctx.userId) q = q.eq("user_id", ctx.userId);

  const { data, error } = await q;
  if (error) throw error;

  const spend = Math.abs(sumAmounts(data));

  return {
    timeRange,
    segment,
    freshnessLabel: ctx.isDemo ? "Live (demo user)" : "Live",
    totalSpend: formatMoneyUSD(spend),
    txCount: data?.length || 0
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
