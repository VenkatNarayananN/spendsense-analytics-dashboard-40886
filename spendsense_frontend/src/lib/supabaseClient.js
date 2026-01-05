import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

let warnedMissingEnv = false;

/**
 * Returns a singleton Supabase client, or null if env vars are missing.
 * We intentionally keep this lightweight: the app can run in "UI-only mode"
 * without Supabase configured.
 */
function getSupabaseClientOrNull() {
  if (!supabaseUrl || !supabaseKey) {
    if (!warnedMissingEnv) {
      // Warn once to avoid noise in development.
      // eslint-disable-next-line no-console
      console.warn(
        "[SpendSense] Supabase env vars missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable realtime updates."
      );
      warnedMissingEnv = true;
    }
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true
    },
    realtime: {
      params: {
        eventsPerSecond: 5
      }
    }
  });
}

export const supabase = getSupabaseClientOrNull();
