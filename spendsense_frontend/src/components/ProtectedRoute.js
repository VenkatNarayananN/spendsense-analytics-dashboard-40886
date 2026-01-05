import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { useAuth } from "../auth/AuthContext";

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children, redirectTo = "/" }) {
  /** Protects routes by requiring a Supabase-authenticated session. */
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // While session is being resolved, show a lightweight guard skeleton.
  if (loading) {
    return (
      <div className="Card" role="status" aria-live="polite">
        <div className="CardHeader">
          <div className="CardTitle">
            <strong>Checking your session…</strong>
            <span>Just a moment</span>
          </div>
        </div>
        <div className="Skeleton" style={{ height: 64, borderRadius: 10 }} />
      </div>
    );
  }

  if (user) return children;

  return (
    <div className="Card" role="alert" aria-live="polite">
      <div className="CardHeader">
        <div className="CardTitle">
          <strong>Sign-in required</strong>
          <span>Access to this page is protected.</span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
        You tried to open <code>{location.pathname}</code>, but you’re not signed in. Please return to the landing page and sign in with
        Google to continue.
      </p>

      <div style={{ height: 12 }} />

      <div className="StateActions">
        <button className="Button ButtonPrimary" type="button" onClick={() => navigate(redirectTo, { replace: true })}>
          Go to Landing
        </button>
        <button className="Button" type="button" onClick={() => window.history.back()}>
          Go back
        </button>
      </div>
    </div>
  );
}

