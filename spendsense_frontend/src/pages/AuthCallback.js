import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";

// PUBLIC_INTERFACE
export default function AuthCallback() {
  /** OAuth callback handler: ensures a session exists, then redirects to the dashboard. */
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState(null);

  const statusText = useMemo(() => {
    if (error) return "Could not complete sign-in.";
    if (loading) return "Finalizing sign-in…";
    if (user) return "Signed in. Redirecting…";
    return "Looking for an active session…";
  }, [error, loading, user]);

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      try {
        if (!supabase) {
          if (!cancelled) {
            setError("Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.");
          }
          return;
        }

        // If the AuthProvider already picked up the session, this is enough.
        if (!loading && user) {
          navigate("/dashboard", { replace: true });
          return;
        }

        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        if (data?.session?.user) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || String(e));
          // Let the user see the message briefly, then route to landing.
          setTimeout(() => navigate("/", { replace: true }), 900);
        }
      }
    }

    finalize();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, user]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
      <div className="Card" style={{ width: "min(560px, 100%)", padding: 18 }}>
        <div className="CardHeader">
          <div className="CardTitle">
            <strong>Signing you in</strong>
            <span>Securely connecting to your SpendSense workspace</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 13, opacity: 0.82 }}>{statusText}</p>

        {error ? (
          <>
            <div style={{ height: 10 }} />
            <div className="StateBox" role="alert" aria-live="polite" style={{ padding: 12 }}>
              <h3 className="StateTitle">Auth error</h3>
              <p className="StateText" style={{ marginBottom: 0 }}>
                {error}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

