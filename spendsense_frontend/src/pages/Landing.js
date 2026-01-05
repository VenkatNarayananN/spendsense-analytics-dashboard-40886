import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { useAuth } from "../auth/AuthContext";

// PUBLIC_INTERFACE
export default function Landing() {
  /** Public landing/login page for SpendSense. */
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState(null);

  const subtitle = useMemo(() => {
    if (loading) return "Checking session…";
    if (user) return "Signed in — redirecting to your dashboard.";
    return "Sign in to access your dashboard, transactions, insights, and alerts.";
  }, [loading, user]);

  const onSignIn = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message || String(err));
    // OAuth will redirect away if successful; no need to navigate here.
  };

  // If already logged in, send to dashboard.
  if (!loading && user) {
    // Using an imperative navigate inside render is not ideal; but it avoids extra effects and is stable here.
    // eslint-disable-next-line no-console
    setTimeout(() => navigate("/dashboard", { replace: true }), 0);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 18
      }}
    >
      <div
        className="Card"
        style={{
          width: "min(920px, 100%)",
          padding: 18,
          boxShadow: "var(--ss-shadow)",
          borderRadius: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="BrandMark" aria-hidden="true" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 850, letterSpacing: 0.2 }}>SpendSense</div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Modern fintech analytics dashboard</div>
            </div>
          </div>

          <span className="Badge">
            <span aria-hidden="true">🔒</span> Secure sign-in
          </span>
        </div>

        <div style={{ height: 14 }} />

        <div className="Grid GridCols2" style={{ alignItems: "stretch" }}>
          <section className="Card" style={{ background: "rgba(255, 255, 255, 0.9)" }}>
            <div className="CardHeader">
              <div className="CardTitle">
                <strong>Welcome back</strong>
                <span>{subtitle}</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
              Track spend performance, explore insights, and stay ahead of anomalies—powered by realtime updates. Sign in with Google to
              continue.
            </p>

            <div style={{ height: 14 }} />

            <div style={{ display: "grid", gap: 10 }}>
              <button
                className="Button ButtonPrimary"
                type="button"
                onClick={onSignIn}
                disabled={loading || Boolean(user)}
                aria-label="Sign in with Google"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  height: 44
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "1px solid rgba(2, 6, 23, 0.10)",
                    background: "rgba(255, 255, 255, 0.9)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13
                  }}
                >
                  G
                </span>
                Sign in with Google
              </button>

              {error ? (
                <div className="StateBox" role="alert" aria-live="polite" style={{ padding: 12 }}>
                  <h3 className="StateTitle">Sign-in failed</h3>
                  <p className="StateText" style={{ marginBottom: 0 }}>
                    {error}
                  </p>
                </div>
              ) : null}

              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Tip: ensure Supabase Google provider is enabled and Redirect URL includes{" "}
                <code>{(process.env.REACT_APP_FRONTEND_URL || window.location.origin) + "/auth/callback"}</code>.
              </div>
            </div>
          </section>

          <section className="Card" style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(15, 118, 110, 0.08))" }}>
            <div className="CardHeader">
              <div className="CardTitle">
                <strong>What you’ll get</strong>
                <span>Fintech-grade overview in seconds</span>
              </div>
            </div>

            <div className="Grid" style={{ gap: 10, fontSize: 13 }}>
              <div className="Pill PillInfo">📊 Dashboard KPIs with live freshness</div>
              <div className="Pill PillInfo">🧾 Transactions with filtering + search</div>
              <div className="Pill PillInfo">✨ Insights that refresh on realtime inserts</div>
              <div className="Pill PillInfo">🔔 Alerts for anomalies and rules</div>
              <div className="Pill PillInfo">⚙️ Settings and workspace status</div>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ fontSize: 12, opacity: 0.72 }}>
              Your session is managed by Supabase Auth. Routes are protected; unauthenticated access returns you here.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

