import React from "react";
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

// PUBLIC_INTERFACE
export default function AppLayout() {
  /** Shared application layout: left sidebar navigation + top header + routed content outlet. */
  const location = useLocation();
  const meta = getPageMeta(location.pathname);

  return (
    <div className="AppShell">
      <aside className="Sidebar" aria-label="Primary navigation">
        <div className="Brand">
          <div className="BrandMark" aria-hidden="true" />
          <div className="BrandTitle">
            <strong>SpendSense</strong>
            <span>Ocean Professional</span>
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
          <div className="TopbarTitle">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
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

        <section className="Page" aria-label={`${meta.title} page content`}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}
