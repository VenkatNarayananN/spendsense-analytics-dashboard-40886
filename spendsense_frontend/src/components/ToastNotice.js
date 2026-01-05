import React from "react";
import "../App.css";

// PUBLIC_INTERFACE
export default function ToastNotice({ message }) {
  /** Small, non-blocking toast-like notice for realtime updates (no external deps). */
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 60,
        maxWidth: 360
      }}
    >
      <div
        className="Card"
        style={{
          padding: "10px 12px",
          boxShadow: "var(--ss-shadow-soft)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid rgba(15, 118, 110, 0.22)",
          background: "rgba(255, 255, 255, 0.92)"
        }}
      >
        <span
          aria-hidden="true"
          style={{
            height: 28,
            width: 28,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "rgba(15, 118, 110, 0.12)",
            border: "1px solid rgba(15, 118, 110, 0.18)"
          }}
        >
          ⟲
        </span>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 750, fontSize: 13 }}>{message}</div>
          <div style={{ fontSize: 12, opacity: 0.72 }}>Live updates are enabled</div>
        </div>
      </div>
    </div>
  );
}
