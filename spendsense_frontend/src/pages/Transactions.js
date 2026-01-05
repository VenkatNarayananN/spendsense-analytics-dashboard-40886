import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { DateRangePicker, EmptyState, ErrorState, FilterBar, MultiSelect, SkeletonTable } from "../components/ux";
import ToastNotice from "../components/ToastNotice";
import { fetchTransactionsSummary } from "../lib/data/dashboardData";
import { useTransactionsRealtime } from "../hooks/useTransactionsRealtime";
import { fetchTransactionsPageFromSupabase } from "../lib/data/supabaseQueries";
import { getAuthenticatedUserId } from "../auth/userContext";
import { formatWithOriginal } from "../lib/fx/openExchangeRates";

function safeDateLabel(isoOrDate) {
  if (!isoOrDate) return "—";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return String(isoOrDate).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions page: Supabase-backed list with pagination + basic filters; USD-normalized display; realtime INSERTs trigger refresh. */

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: "Dining", label: "Dining" },
      { value: "Groceries", label: "Groceries" },
      { value: "Transport", label: "Transport" },
      { value: "Subscriptions", label: "Subscriptions" },
      { value: "Shopping", label: "Shopping" },
      { value: "Coffee", label: "Coffee" },
      { value: "Utilities", label: "Utilities" },
      { value: "Phone", label: "Phone" },
      { value: "Internet", label: "Internet" },
      { value: "Health", label: "Health" },
      { value: "Fitness", label: "Fitness" },
      { value: "Entertainment", label: "Entertainment" },
      { value: "Travel", label: "Travel" }
    ],
    []
  );

  const [filters, setFilters] = useState({
    dateRange: { from: "", to: "" },
    categories: [],
    amountMin: "",
    amountMax: "",
    search: ""
  });

  // Live paging state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [listState, setListState] = useState({ loading: true, error: null, rows: [], total: 0, fx: null });
  const [summary, setSummary] = useState({
    totalSpendFiltered: "$0.00",
    averageTransaction: "$0.00",
    fx: null
  });

  const [fxNotice, setFxNotice] = useState(null);

  const refreshList = useCallback(
    async (opts = {}) => {
      const nextPage = opts.page ?? page;
      try {
        setListState((p) => ({ ...p, loading: true, error: null }));
        const userId = await getAuthenticatedUserId();
        const res = await fetchTransactionsPageFromSupabase({
          userId,
          allowDemoUser: true,
          page: nextPage,
          pageSize,
          filters
        });

        setListState({
          loading: false,
          error: null,
          rows: res.rows || [],
          total: res.total || 0,
          fx: res.fx || null
        });

        if (res?.fx?.usedFallback && res?.fx?.warning) setFxNotice(res.fx.warning);
      } catch (e) {
        setListState((p) => ({
          ...p,
          loading: false,
          error: e?.message || String(e)
        }));
      }
    },
    [filters, page, pageSize]
  );

  const refreshSummaries = useCallback(async () => {
    try {
      const next = await fetchTransactionsSummary(filters);
      setSummary(next);

      if (next?.fx?.usedFallback && next?.fx?.warning) setFxNotice(next.fx.warning);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[SpendSense] Failed to refresh transaction summaries.", e);
    }
  }, [filters]);

  const refreshAll = useCallback(
    async (opts = {}) => {
      await Promise.all([refreshList(opts), refreshSummaries()]);
    },
    [refreshList, refreshSummaries]
  );

  // Initial + whenever filters/page changes
  useEffect(() => {
    refreshAll({ page });
  }, [page, refreshAll]);

  // Realtime hook: on INSERT refresh list + summaries.
  const { notice } = useTransactionsRealtime({
    onRefreshRequested: () => refreshAll({ page: 1 })
  });

  // Auto-clear FX notice after a while (non-blocking).
  useEffect(() => {
    if (!fxNotice) return undefined;
    const t = window.setTimeout(() => setFxNotice(null), 5200);
    return () => window.clearTimeout(t);
  }, [fxNotice]);

  // When filters change, reset to page 1 (and refetch).
  useEffect(() => {
    setPage(1);
  }, [filters.dateRange?.from, filters.dateRange?.to, filters.search, filters.amountMin, filters.amountMax, filters.categories]);

  const onClearAll = () => {
    setFilters({ dateRange: { from: "", to: "" }, categories: [], amountMin: "", amountMax: "", search: "" });
  };

  const onRemoveFilter = (key) => {
    setFilters((prev) => {
      if (key === "dateRange") return { ...prev, dateRange: { from: "", to: "" } };
      if (key === "categories") return { ...prev, categories: [] };
      if (key === "amountMin") return { ...prev, amountMin: "" };
      if (key === "amountMax") return { ...prev, amountMax: "" };
      if (key === "search") return { ...prev, search: "" };
      return prev;
    });
  };

  const filteredSummary = useMemo(() => {
    const activeCount =
      (filters.search ? 1 : 0) +
      (filters.amountMin ? 1 : 0) +
      (filters.amountMax ? 1 : 0) +
      (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
      (filters.categories.length ? 1 : 0);

    return {
      activeCount,
      descriptor: activeCount ? `${activeCount} filters applied` : "No filters applied"
    };
  }, [filters]);

  const totalPages = useMemo(() => {
    const t = Number(listState.total) || 0;
    return t > 0 ? Math.ceil(t / pageSize) : 1;
  }, [listState.total, pageSize]);

  const canPrev = page > 1 && !listState.loading;
  const canNext = page < totalPages && !listState.loading;

  return (
    <>
      <ToastNotice message={fxNotice || notice} />

      <div className="PageHeader">
        <div>
          <h2>Transactions</h2>
          <p>Browse, search, and categorize spending activity (USD-normalized display).</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">🧾</span> {filteredSummary.descriptor}
        </span>
      </div>

      <div className="Grid" style={{ gap: 14 }}>
        <FilterBar title="Transaction Filters" filters={filters} onClearAll={onClearAll} onRemoveFilter={onRemoveFilter}>
          <DateRangePicker value={filters.dateRange} onChange={(dateRange) => setFilters((p) => ({ ...p, dateRange }))} />

          <MultiSelect
            label="Categories"
            options={CATEGORY_OPTIONS}
            value={filters.categories}
            onChange={(categories) => setFilters((p) => ({ ...p, categories }))}
            placeholder="All categories"
          />

          <div className="Field" style={{ minWidth: 180 }}>
            <div className="FieldLabel">Amount min</div>
            <input
              className="NumberInput"
              inputMode="decimal"
              placeholder="-500.00"
              value={filters.amountMin}
              onChange={(e) => setFilters((p) => ({ ...p, amountMin: e.target.value }))}
              aria-label="Minimum amount"
            />
            <div className="FieldHelp">Filters apply to the raw amount column (not USD). Tip: seed expenses are negative.</div>
          </div>

          <div className="Field" style={{ minWidth: 180 }}>
            <div className="FieldLabel">Amount max</div>
            <input
              className="NumberInput"
              inputMode="decimal"
              placeholder="0.00"
              value={filters.amountMax}
              onChange={(e) => setFilters((p) => ({ ...p, amountMax: e.target.value }))}
              aria-label="Maximum amount"
            />
          </div>

          <div className="Field" style={{ minWidth: 240, flex: "1 1 240px" }}>
            <div className="FieldLabel">Search</div>
            <input
              className="TextInput"
              placeholder="Merchant, memo, description…"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              aria-label="Search transactions"
            />
            <div className="FieldHelp">Uses ilike across merchant/description/memo (and category fallback).</div>
          </div>
        </FilterBar>

        <div className="Grid GridCols2">
          <Card title="Summary" subtitle="Computed from filtered results (USD)">
            <div className="Grid" style={{ gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Total spend (filtered, USD)</div>
                <div className="Metric">{summary.totalSpendFiltered}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Average transaction (USD)</div>
                <div className="Metric">{summary.averageTransaction}</div>
              </div>
            </div>
          </Card>

          <Card title="Pagination" subtitle="Browse the ledger">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> • Total rows:{" "}
                <strong>{listState.total || 0}</strong>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="Button" type="button" onClick={() => setPage(1)} disabled={!canPrev}>
                  First
                </button>
                <button className="Button" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
                  Prev
                </button>
                <button className="Button ButtonPrimary" type="button" onClick={() => refreshAll({ page })} disabled={listState.loading}>
                  Refresh
                </button>
                <button
                  className="Button"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!canNext}
                >
                  Next
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Realtime: INSERTs into <code>public.transactions</code> refresh this page.
              </div>
            </div>
          </Card>
        </div>

        <Card title="Transaction List" subtitle="Supabase-backed table (transactions + categories) • Amounts shown in USD">
          {listState.loading ? (
            <SkeletonTable rows={7} columns={5} />
          ) : listState.error ? (
            <ErrorState title="Couldn't load transactions" message={listState.error} onRetry={() => refreshAll({ page })} />
          ) : !listState.rows.length ? (
            <EmptyState
              title="No transactions match your filters"
              message="Try widening the date range, removing category filters, or clearing search."
              ctaLabel="Clear all filters"
              onCta={() => {
                onClearAll();
                setPage(1);
              }}
              secondaryLabel="Reload"
              onSecondary={() => refreshAll({ page: 1 })}
            />
          ) : (
            <>
              <table className="Table" aria-label="Transactions table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Category</th>
                    <th>Amount (USD)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listState.rows.map((t) => {
                    const fmt = formatWithOriginal({
                      amountUsd: t.amount_usd,
                      originalAmount: t.original_amount,
                      originalCurrency: t.currency
                    });

                    return (
                      <tr key={t.id}>
                        <td>{safeDateLabel(t.date)}</td>
                        <td>{t.merchant}</td>
                        <td>{t.category}</td>
                        <td title={fmt.title}>{fmt.text}</td>
                        <td>
                          <span className={`Pill ${t.status === "cleared" ? "PillSuccess" : t.status === "pending" ? "PillWarn" : ""}`}>
                            {t.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ height: 12 }} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12, opacity: 0.75 }}>
                <span>
                  Tip: Hover the USD amount to see the original currency amount (when available). Filters still operate on the raw stored
                  amount.
                </span>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
