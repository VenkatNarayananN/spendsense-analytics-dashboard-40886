import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import "../App.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", desc: "Overview & KPIs", icon: "📊" },
  { to: "/transactions", label: "Transactions", desc: "Activity & ledger", icon: "🧾" },
  { to: "/insights", label: "Insights", desc: "Trends & analysis", icon: "✨" },
  { to: "/alerts", label: "Alerts", desc: "Rules & anomalies", icon: "🔔" },
  { to: "/settings", label: "Settings", desc: "Preferences", icon: "⚙️" }
];

function getPageMeta(pathname) {
  if (pathname === "/") return { title: "Dashboard", subtitle: "A calm view of your spend performance." };
  if (pathname.startsWith("/transactions")) return { title: "Transactions", subtitle: "Review activity, categories, and merchants." };
  if (pathname.startsWith("/insights")) return { title: "Insights", subtitle: "Spot trends and opportunities at a glance." };
  if (pathname.startsWith("/alerts")) return { title: "Alerts", subtitle: "Monitor anomalies and budgeting rules." };
  if (pathname.startsWith("/settings")) return { title: "Settings", subtitle: "Configure your SpendSense workspace." };
  return { title: "SpendSense", subtitle: "Analytics dashboard." };
}

function MobileNav({ isOpen, onClose, items }) {
  return (
    <div className={`MobileNavOverlay ${isOpen ? "MobileNavOverlayOpen" : ""}`} aria-hidden={!isOpen}>
      <button
        type="button"
        className="MobileNavBackdrop"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close navigation menu"
      />
      <aside
        className={`MobileNavDrawer ${isOpen ? "MobileNavDrawerOpen" : ""}`}
        aria-label="Mobile navigation drawer"
      >
        <div className="MobileNavHeader">
          <div className="Brand" style={{ padding: 0 }}>
            <div className="BrandMark" aria-hidden="true" />
            <div className="BrandTitle">
              <strong>SpendSense</strong>
              <span>Fintech Modern</span>
            </div>
          </div>

          <button className="IconButton" type="button" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="NavGroup" style={{ marginTop: 12 }}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) => `NavItem ${isActive ? "NavItemActive" : ""}`}
            >
              <span className="NavIcon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="NavMeta">
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function AppLayout() {
  /** Shared application layout: left sidebar navigation + responsive top header + routed content outlet. */
  const location = useLocation();
  const meta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav whenever route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Escape to close for accessibility.
  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="AppShell">
      <aside className="Sidebar" aria-label="Primary navigation">
        <div className="Brand">
          <div className="BrandMark" aria-hidden="true" />
          <div className="BrandTitle">
            <strong>SpendSense</strong>
            <span>Fintech Modern</span>
          </div>
        </div>

        <nav className="NavGroup">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `NavItem ${isActive ? "NavItemActive" : ""}`}
            >
              <span className="NavIcon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="NavMeta">
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="Main">
        <header className="Topbar" aria-label="Header">
          <div className="TopbarLeft">
            <button
              className="IconButton MobileOnly"
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-haspopup="dialog"
              aria-expanded={mobileNavOpen}
            >
              ☰
            </button>

            <div className="TopbarTitle">
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>

          <div className="TopbarActions">
            <label className="SrOnly" htmlFor="ss-search">
              Search
            </label>
            <input
              id="ss-search"
              className="SearchInput"
              placeholder="Search transactions, merchants…"
              aria-label="Search"
            />
            <button className="Button ButtonPrimary" type="button">
              + Add
            </button>
            <button className="Button" type="button" aria-label="Notifications">
              🔔
            </button>
          </div>
        </header>

        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} items={NAV_ITEMS} />

        <section className="Page" aria-label={`${meta.title} page content`}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}
