import React, { useMemo, useState } from "react";
import { Card } from "../components/ui";
import { DateRangePicker, EmptyState, ErrorState, FilterBar, MultiSelect, SkeletonTable } from "../components/ux";

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions page: filter bar + transaction table placeholder with robust UX states (local state only). */

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: "Dining", label: "Dining" },
      { value: "Groceries", label: "Groceries" },
      { value: "Transport", label: "Transport" },
      { value: "Subscriptions", label: "Subscriptions" },
      { value: "Shopping", label: "Shopping" }
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

  // Demo-only UI states (no real fetch yet).
  const [uiState, setUiState] = useState("ready"); // "loading" | "empty" | "error" | "ready"

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

  return (
    <>
      <div className="PageHeader">
        <div>
          <h2>Transactions</h2>
          <p>Browse, search, and categorize spending activity.</p>
        </div>
        <span className="Badge">
          <span aria-hidden="true">🧾</span> {filteredSummary.descriptor}
        </span>
      </div>

      <div className="Grid" style={{ gap: 14 }}>
        <FilterBar
          title="Transaction Filters"
          filters={filters}
          onClearAll={onClearAll}
          onRemoveFilter={onRemoveFilter}
        >
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
              placeholder="0.00"
              value={filters.amountMin}
              onChange={(e) => setFilters((p) => ({ ...p, amountMin: e.target.value }))}
              aria-label="Minimum amount"
            />
          </div>

          <div className="Field" style={{ minWidth: 180 }}>
            <div className="FieldLabel">Amount max</div>
            <input
              className="NumberInput"
              inputMode="decimal"
              placeholder="500.00"
              value={filters.amountMax}
              onChange={(e) => setFilters((p) => ({ ...p, amountMax: e.target.value }))}
              aria-label="Maximum amount"
            />
          </div>

          <div className="Field" style={{ minWidth: 240, flex: "1 1 240px" }}>
            <div className="FieldLabel">Search</div>
            <input
              className="TextInput"
              placeholder="Merchant, memo, category…"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              aria-label="Search transactions"
            />
            <div className="FieldHelp">Example: “streaming”, “cafe”, “uber”.</div>
          </div>

          <div className="Field" style={{ minWidth: 220 }}>
            <div className="FieldLabel">Demo state</div>
            <select className="Select" value={uiState} onChange={(e) => setUiState(e.target.value)} aria-label="Demo state">
              <option value="ready">Ready</option>
              <option value="loading">Loading</option>
              <option value="empty">Empty</option>
              <option value="error">Error</option>
            </select>
            <div className="FieldHelp">This toggles loading/empty/error UI (no backend).</div>
          </div>
        </FilterBar>

        <div className="Grid GridCols2">
          <Card title="Summary" subtitle="Quick totals (placeholder)">
            <div className="Grid" style={{ gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Total spend (filtered)</div>
                <div className="Metric">$1,204.33</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Average transaction</div>
                <div className="Metric">$24.09</div>
              </div>
            </div>
          </Card>

          <Card title="Actions" subtitle="Helpful shortcuts">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="Button ButtonPrimary" type="button" onClick={() => setUiState("loading")}>
                Simulate load
              </button>
              <button className="Button" type="button" onClick={() => setUiState("empty")}>
                Simulate empty
              </button>
              <button className="Button ButtonDanger" type="button" onClick={() => setUiState("error")}>
                Simulate error
              </button>
            </div>
          </Card>
        </div>

        <Card title="Transaction List" subtitle="Placeholder table (wire to backend later)">
          {uiState === "loading" ? (
            <SkeletonTable rows={7} columns={5} />
          ) : uiState === "error" ? (
            <ErrorState
              title="Couldn't load transactions"
              message="This is a UI-only error placeholder. Hook this up to real fetch retries later."
              onRetry={() => setUiState("ready")}
            />
          ) : uiState === "empty" ? (
            <EmptyState
              title="No transactions match your filters"
              message="Try widening the date range, removing category filters, or clearing search."
              ctaLabel="Clear all filters"
              onCta={() => {
                onClearAll();
                setUiState("ready");
              }}
              secondaryLabel="Set to Ready"
              onSecondary={() => setUiState("ready")}
            />
          ) : (
            <table className="Table" aria-label="Transactions table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-01-05</td>
                  <td>Silver Streaming</td>
                  <td>Subscriptions</td>
                  <td>-$12.99</td>
                  <td>
                    <span className="Pill PillWarn">Review</span>
                  </td>
                </tr>
                <tr>
                  <td>2026-01-04</td>
                  <td>Rose Market</td>
                  <td>Groceries</td>
                  <td>-$96.72</td>
                  <td>
                    <span className="Pill">—</span>
                  </td>
                </tr>
                <tr>
                  <td>2026-01-03</td>
                  <td>Ocean Café</td>
                  <td>Dining</td>
                  <td>-$18.40</td>
                  <td>
                    <span className="Pill PillSuccess">OK</span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
