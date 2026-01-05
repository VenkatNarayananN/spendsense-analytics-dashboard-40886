import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * @typedef {"signin"|"signup"} AuthIntent
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {import("@supabase/supabase-js").Session|null} session
 * @property {import("@supabase/supabase-js").User|null} user
 * @property {boolean} loading
 * @property {(opts?: {redirectTo?: string, intent?: AuthIntent}) => Promise<{error?: any}>} signInWithGoogle
 * @property {(opts?: {redirectTo?: string}) => Promise<{error?: any}>} signUpWithGoogle
 * @property {() => Promise<{error?: any}>} signOut
 */

const AuthContext = createContext(
  /** @type {AuthContextValue} */ ({
    session: null,
    user: null,
    loading: true,
    signInWithGoogle: async () => ({}),
    signUpWithGoogle: async () => ({}),
    signOut: async () => ({})
  })
);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides Supabase auth session/user state to the app and keeps it in sync via onAuthStateChange. */
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial session fetch + subscribe to auth changes.
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (!supabase) {
          // App can run without Supabase configured; treat as unauthenticated.
          if (mounted) {
            setSession(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // eslint-disable-next-line no-console
          console.warn("[SpendSense] Failed to get initial session.", error);
        }

        if (mounted) {
          setSession(data?.session ?? null);
          setLoading(false);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[SpendSense] Session init error.", e);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    }

    init();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const user = session?.user ?? null;

  /**
   * Best-effort profile bootstrap.
   * This is intentionally tolerant:
   * - If a `profiles` table doesn't exist or RLS blocks it, we no-op.
   * - If it exists, we upsert minimal metadata for new users.
   */
  async function bootstrapProfileIfNeeded(nextSession) {
    if (!supabase) return;
    const nextUser = nextSession?.user;
    if (!nextUser?.id) return;

    try {
      // `upsert` is idempotent; if the row exists, it will update timestamps/fields.
      // If your project does not have a `profiles` table, this will throw and we ignore it.
      await supabase.from("profiles").upsert(
        {
          id: nextUser.id,
          email: nextUser.email ?? null,
          full_name:
            nextUser.user_metadata?.full_name ||
            nextUser.user_metadata?.name ||
            null,
          avatar_url:
            nextUser.user_metadata?.avatar_url ||
            nextUser.user_metadata?.picture ||
            null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );
    } catch (_e) {
      // No-op by design. Different deployments may not include a profiles table.
    }
  }

  // On auth changes, attempt bootstrap for newly authenticated sessions.
  useEffect(() => {
    if (!supabase) return;
    if (!session?.user) return;
    bootstrapProfileIfNeeded(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const signInWithGoogleImpl = async (opts = {}) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.") };
    }

    const baseUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const redirectTo = opts.redirectTo || `${baseUrl}/auth/callback`;

    /** @type {"signin"|"signup"} */
    const intent = opts.intent || "signin";

    // Supabase uses the same OAuth call for both sign-in and sign-up.
    // We pass a different "queryParams" set for sign-up to more reliably trigger
    // an explicit consent / account chooser on Google for first-time users.
    const queryParams =
      intent === "signup"
        ? {
            prompt: "consent select_account"
          }
        : {
            prompt: "select_account"
          };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams
      }
    });

    return { error };
  };

  const signUpWithGoogleImpl = async (opts = {}) => {
    return signInWithGoogleImpl({ ...opts, intent: "signup" });
  };

  const signOutImpl = async () => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signInWithGoogle: signInWithGoogleImpl,
      signUpWithGoogle: signUpWithGoogleImpl,
      signOut: signOutImpl
    }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth session/user/loading and auth actions from AuthProvider. */
  return useContext(AuthContext);
}

