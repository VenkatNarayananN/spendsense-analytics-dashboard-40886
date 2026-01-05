import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { useAuth } from "../auth/AuthContext";

function initialsFromUser(user) {
  const raw =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "U";
  const parts = String(raw).trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

// PUBLIC_INTERFACE
export default function UserMenu() {
  /** Top-right user avatar + menu with sign out. */
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "Signed in"
    );
  }, [user]);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  if (!user) return null;

  const onSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="IconButton"
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          overflow: "hidden",
          padding: 0
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 12, fontWeight: 850 }}>{initialsFromUser(user)}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="Card"
          style={{
            position: "absolute",
            right: 0,
            top: 48,
            width: 260,
            padding: 12,
            boxShadow: "var(--ss-shadow-soft)",
            zIndex: 30
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{displayName}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{user.email}</div>
          </div>

          <div style={{ height: 10 }} />

          <button className="Button ButtonDanger" type="button" onClick={onSignOut} role="menuitem">
            Sign out
          </button>

          <div style={{ height: 8 }} />

          <button className="Button" type="button" onClick={() => setOpen(false)} role="menuitem">
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

