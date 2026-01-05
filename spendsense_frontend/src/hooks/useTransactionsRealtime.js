import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Normalize and defensively format a transaction payload coming from Supabase Realtime.
 * We avoid hard-coding schema beyond "public.transactions" and keep this optional/soft.
 */
function normalizeTransaction(row) {
  if (!row || typeof row !== "object") return null;

  // Common field guesses (safe fallbacks). UI uses these only for in-memory list updates.
  const amount = row.amount ?? row.total ?? row.value ?? null;
  const merchant = row.merchant ?? row.merchant_name ?? row.payee ?? row.description ?? "New transaction";
  const category = row.category ?? row.category_name ?? "—";
  const date = row.date ?? row.created_at ?? row.timestamp ?? new Date().toISOString();

  return {
    ...row,
    amount,
    merchant,
    category,
    date
  };
}

/**
 * @typedef {Object} UseTransactionsRealtimeOptions
 * @property {(tx: any) => void=} onInsert Called when a new transaction row is received.
 * @property {() => void=} onRefreshRequested Called after insert to signal "refetch summaries now".
 * @property {boolean=} enabled Enable/disable subscription (default true).
 * @property {string=} schema Supabase schema name (default "public").
 * @property {string=} table Supabase table name (default "transactions").
 */

/**
 * Hook for listening to realtime INSERTs on transactions and emitting UI refresh signals.
 */
// PUBLIC_INTERFACE
export function useTransactionsRealtime(options = {}) {
  /** Subscribe/unsubscribe to Supabase Realtime and return toast state + last inserted tx. */
  const {
    onInsert,
    onRefreshRequested,
    enabled = true,
    schema = "public",
    table = "transactions"
  } = options;

  const [lastInserted, setLastInserted] = useState(null);
  const [notice, setNotice] = useState(null);

  const clearTimerRef = useRef(null);

  const canUseRealtime = useMemo(() => Boolean(enabled && supabase), [enabled]);

  useEffect(() => {
    if (!canUseRealtime) return undefined;

    if (!schema || !table) {
      // eslint-disable-next-line no-console
      console.warn("[SpendSense] Realtime subscription not started: schema/table missing.");
      return undefined;
    }

    const channelName = `ss-rt:${schema}.${table}:insert`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema, table },
        (payload) => {
          const nextTx = normalizeTransaction(payload?.new);

          setLastInserted(nextTx);
          onInsert?.(nextTx);

          // Trigger refetch signals for KPI summaries / charts / tables.
          onRefreshRequested?.();

          // Subtle, non-blocking in-app notice.
          setNotice("New transaction received");

          if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
          clearTimerRef.current = window.setTimeout(() => setNotice(null), 3200);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // eslint-disable-next-line no-console
          console.warn("[SpendSense] Realtime channel error. Check Supabase config / RLS / network.");
        }
      });

    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;

      // Ensure we unsubscribe to avoid leaks.
      supabase.removeChannel(channel);
    };
  }, [canUseRealtime, onInsert, onRefreshRequested, schema, table]);

  return { lastInserted, notice };
}
