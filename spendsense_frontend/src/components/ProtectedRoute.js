import React from "react";
import { useLocation } from "react-router-dom";
import "../App.css";

/**
 * Local, temporary auth stub. Replace this with real auth integration later.
 * Intentionally conservative: defaults to "allowed" so routes keep working by default.
 */
function useAuthStub() {
  // In the future, this can read from Supabase session, a JWT, or global app state.
  return { isAuthenticated: true };
}

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children, redirectTo = "/" }) {
  /** Protected route scaffolding. If user is not authenticated, shows a placeholder guard screen. */
  const { isAuthenticated } = useAuthStub();
  const location = useLocation();

  if (isAuthenticated) return children;

  // If you prefer a redirect instead of a placeholder screen, swap this return with:
  // return <Navigate to={redirectTo} replace state={{ from: location }} />;
  return (
    <div className="Card" role="alert" aria-live="polite">
      <div className="CardHeader">
        <div className="CardTitle">
          <strong>Protected page (placeholder)</strong>
          <span>Authentication is not wired yet.</span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
        You attempted to access: <code>{location.pathname}</code>
      </p>

      <div style={{ height: 12 }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="Button ButtonPrimary" type="button" onClick={() => window.history.back()}>
          Go back
        </button>
        <NavigateButton to={redirectTo} label="Return home" />
      </div>
    </div>
  );
}

// Small internal helper for navigation without introducing extra dependencies/hooks here.
function NavigateButton({ to, label }) {
  return (
    <a className="Button" href={to} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
      {label}
    </a>
  );
}
