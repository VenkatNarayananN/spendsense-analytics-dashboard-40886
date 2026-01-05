import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * @typedef {Object} AuthContextValue
 * @property {import("@supabase/supabase-js").Session|null} session
 * @property {import("@supabase/supabase-js").User|null} user
 * @property {boolean} loading
 * @property {(opts?: {redirectTo?: string}) => Promise<{error?: any}>} signInWithGoogle
 * @property {() => Promise<{error?: any}>} signOut
 */

const AuthContext = createContext(
  /** @type {AuthContextValue} */ ({
    session: null,
    user: null,
    loading: true,
    signInWithGoogle: async () => ({}),
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

  const signInWithGoogleImpl = async (opts = {}) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.") };
    }

    const baseUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const redirectTo = opts.redirectTo || `${baseUrl}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    return { error };
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

