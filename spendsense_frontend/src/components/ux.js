import React, { useMemo, useState } from "react";
import "../App.css";

/**
 * UX building blocks:
 * - EmptyState / ErrorState: consistent state placeholders with CTA hooks
 * - SkeletonCard / SkeletonTable: loading placeholders
 * - Pill: removable/interactive chip
 * - SegmentedControl: time range + segment selectors
 * - DateRangePicker: basic date range entry (no external deps)
 * - FilterBar: layout wrapper for filters + active pills
 */

// PUBLIC_INTERFACE
export function Pill({ label, tone = "default", onRemove, onClick, ariaLabel }) {
  /** Pill component for filter chips and small status elements. */
  const toneClass =
    tone === "success"
      ? "PillSuccess"
      : tone === "error"
        ? "PillError"
        : tone === "warn"
          ? "PillWarn"
          : tone === "info"
            ? "PillInfo"
            : "";

  const interactive = Boolean(onRemove || onClick);
  const className = `Pill ${toneClass} ${interactive ? "PillButton" : ""}`.trim();

  return (
    <span
      className={className}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={ariaLabel}
    >
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          className="IconButton"
          style={{ height: 26, width: 26, borderRadius: 999, padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}

// PUBLIC_INTERFACE
export function EmptyState({ title, message, ctaLabel = "Adjust filters", onCta, secondaryLabel, onSecondary }) {
  /** Empty state placeholder for lists, charts, or pages. */
  return (
    <div className="StateBox" role="status" aria-live="polite">
      <h3 className="StateTitle">{title}</h3>
      <p className="StateText">{message}</p>
      <div className="StateActions">
        {ctaLabel ? (
          <button className="Button ButtonPrimary" type="button" onClick={onCta}>
            {ctaLabel}
          </button>
        ) : null}
        {secondaryLabel ? (
          <button className="Button" type="button" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function ErrorState({ title = "Something went wrong", message, onRetry, retryLabel = "Retry" }) {
  /** Error state placeholder with retry hook (UI only). */
  return (
    <div className="StateBox" role="alert" aria-live="polite">
      <h3 className="StateTitle">{title}</h3>
      <p className="StateText">{message || "We couldn't load this section. Please try again."}</p>
      <div className="StateActions">
        <button className="Button ButtonPrimary" type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

function SkeletonBlock({ height, width = "100%", radius = 10, style }) {
  return <div className="Skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

// PUBLIC_INTERFACE
export function SkeletonCard({ lines = 3 }) {
  /** Skeleton placeholder approximating a KPI/content card. */
  return (
    <section className="Card" aria-label="Loading card">
      <div style={{ display: "grid", gap: 10 }}>
        <SkeletonBlock height={12} width="46%" />
        <SkeletonBlock height={10} width="64%" style={{ opacity: 0.7 }} />
        <div style={{ height: 6 }} />
        <SkeletonBlock height={28} width="40%" radius={12} />
        <div style={{ height: 8 }} />
        <SkeletonBlock height={10} width="100%" />
        {Array.from({ length: Math.max(0, lines - 1) }).map((_, idx) => (
          <SkeletonBlock key={idx} height={10} width={idx % 2 ? "88%" : "96%"} style={{ opacity: 0.85 }} />
        ))}
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
export function SkeletonTable({ rows = 6, columns = 5 }) {
  /** Skeleton placeholder approximating a table with rows/columns. */
  return (
    <div aria-label="Loading table">
      <div style={{ display: "grid", gap: 10 }}>
        <SkeletonBlock height={12} width="32%" />
        <div className="Card" style={{ padding: 12 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }}>
              {Array.from({ length: columns }).map((_, idx) => (
                <SkeletonBlock key={idx} height={10} width="90%" />
              ))}
            </div>

            {Array.from({ length: rows }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }}
              >
                {Array.from({ length: columns }).map((__, colIdx) => (
                  <SkeletonBlock key={colIdx} height={10} width={`${80 - (colIdx % 3) * 10}%`} style={{ opacity: 0.85 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function SegmentedControl({ options, value, onChange, ariaLabel = "Segmented control" }) {
  /** Compact segmented selector (e.g., time ranges / segments). */
  return (
    <div className="SegmentedControl" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`SegmentedItem ${isActive ? "SegmentedItemActive" : ""}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    // Normalize to YYYY-MM-DD.
    const d = new Date(value);
    // If invalid, return as-is for the input.
    if (Number.isNaN(d.getTime())) return value;
    return d.toISOString().slice(0, 10);
  } catch {
    return value;
  }
}

// PUBLIC_INTERFACE
export function DateRangePicker({ value, onChange, label = "Date range" }) {
  /** Basic date range picker using two <input type="date" /> fields. */
  const from = value?.from || "";
  const to = value?.to || "";

  return (
    <div className="Field" style={{ minWidth: 220 }}>
      <div className="FieldLabel">{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="date"
          className="TextInput"
          value={formatDate(from)}
          onChange={(e) => onChange({ from: e.target.value, to })}
          aria-label={`${label} start date`}
          style={{ width: 160 }}
        />
        <input
          type="date"
          className="TextInput"
          value={formatDate(to)}
          onChange={(e) => onChange({ from, to: e.target.value })}
          aria-label={`${label} end date`}
          style={{ width: 160 }}
        />
      </div>
      <div className="FieldHelp">Tip: pick a start and end date (local state only).</div>
    </div>
  );
}

function buildFilterPills(filters) {
  const pills = [];

  if (filters.search) pills.push({ key: "search", label: `Search: "${filters.search}"` });
  if (filters.amountMin) pills.push({ key: "amountMin", label: `Min: ${filters.amountMin}` });
  if (filters.amountMax) pills.push({ key: "amountMax", label: `Max: ${filters.amountMax}` });

  if (filters.dateRange?.from || filters.dateRange?.to) {
    const from = filters.dateRange?.from || "…";
    const to = filters.dateRange?.to || "…";
    pills.push({ key: "dateRange", label: `Dates: ${from} → ${to}` });
  }

  if (Array.isArray(filters.categories) && filters.categories.length > 0) {
    pills.push({ key: "categories", label: `Categories: ${filters.categories.join(", ")}` });
  }

  if (filters.status) pills.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.severity) pills.push({ key: "severity", label: `Severity: ${filters.severity}` });

  if (filters.timeRange) pills.push({ key: "timeRange", label: `Time: ${filters.timeRange}` });
  if (filters.segment) pills.push({ key: "segment", label: `Segment: ${filters.segment}` });

  return pills;
}

// PUBLIC_INTERFACE
export function FilterBar({ title = "Filters", filters, onClearAll, onRemoveFilter, children }) {
  /** Layout wrapper for filter controls + active filter pills with clear-all. */
  const pills = useMemo(() => buildFilterPills(filters || {}), [filters]);

  return (
    <section className="Card" aria-label={`${title} controls`}>
      <div className="CardHeader" style={{ marginBottom: 12 }}>
        <div className="CardTitle">
          <strong>{title}</strong>
          <span>Refine what you see (local state only)</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="Button" type="button" onClick={onClearAll} disabled={pills.length === 0}>
            Clear all
          </button>
        </div>
      </div>

      <div className="FilterBar">
        <div className="FilterBarRow">{children}</div>

        <div className="FilterPills" aria-label="Active filters">
          <span className="FilterPillsMeta">{pills.length ? "Active:" : "No active filters"}</span>
          {pills.map((p) => (
            <Pill key={p.key} label={p.label} onRemove={onRemoveFilter ? () => onRemoveFilter(p.key) : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
export function MultiSelect({ label, options, value, onChange, placeholder = "Select…" }) {
  /** Simple multi-select using checkboxes in a popover-like area (no external deps). */
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? value : [];

  const summary = selected.length ? `${selected.length} selected` : placeholder;

  return (
    <div className="Field" style={{ minWidth: 220 }}>
      <div className="FieldLabel">{label}</div>
      <button
        type="button"
        className="Button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {summary}
      </button>

      {open ? (
        <div
          className="Card"
          role="dialog"
          aria-label={`${label} multi-select`}
          style={{ padding: 12, boxShadow: "var(--ss-shadow-soft)", position: "relative" }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value);
                      onChange(next);
                    }}
                  />
                  {opt.label}
                </label>
              );
            })}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="Button ButtonPrimary"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Apply multi-select"
              >
                Apply
              </button>
              <button className="Button" type="button" onClick={() => onChange([])}>
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
