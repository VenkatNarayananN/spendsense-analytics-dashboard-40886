import { supabase } from "../lib/supabaseClient";

/**
 * Best-effort helper for data-fetch functions to scope queries to the authenticated user when available.
 * Keeps the previous "demo user" behavior by returning `null` if no session exists.
 */

// PUBLIC_INTERFACE
export async function getAuthenticatedUserId() {
  /** Returns the current authenticated Supabase user id if available; otherwise returns null. */
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

