import { useState } from "react";
import { supabase } from "../services/supabase";
import logo from "../assets/Screenshot_2026-06-19_143129-removebg-preview.webp";

// Nav items shared between desktop sidebar and mobile bottom bar
const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Today",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    id: "upcoming",
    label: "Upcoming",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
  },
  {
    id: "captured",
    label: "Captured",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="8 17 12 21 16 17" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
      </svg>
    ),
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
];

function Sidebar({ setCurrentPage, user, onDragToUpcoming }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [upcomingDragOver, setUpcomingDragOver] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigate(page) {
    setActivePage(page);
    setCurrentPage(page);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  function handleUpcomingDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setUpcomingDragOver(true);
  }

  function handleUpcomingDragLeave() { setUpcomingDragOver(false); }

  function handleUpcomingDrop(e) {
    e.preventDefault();
    setUpcomingDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && onDragToUpcoming) onDragToUpcoming(taskId);
  }

  const initial = user?.email ? user.email[0].toUpperCase() : "U";

  return (
    <>
      {/* ── Mobile top-right profile/logout ─────────────────── */}
      <div className="mobile-topbar">
        <button className="mobile-avatar-btn" onClick={() => setMobileMenuOpen((o) => !o)}>
          {initial}
        </button>
        {mobileMenuOpen && (
          <>
            <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
            <div className="mobile-user-dropdown">
              <div className="user-row" style={{ padding: "0 0 12px 0" }}>
                <div className="avatar">{initial}</div>
                <div>
                  <div className="user-name">{user?.user_metadata?.full_name || "User"}</div>
                  <div className="user-email">{user?.email}</div>
                </div>
              </div>
              <button className="logout-btn" onClick={logout}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <div className="logo">
          <img src={logo} alt="Captur." />
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
              onDragOver={item.id === "upcoming" ? handleUpcomingDragOver : undefined}
              onDragLeave={item.id === "upcoming" ? handleUpcomingDragLeave : undefined}
              onDrop={item.id === "upcoming" ? handleUpcomingDrop : undefined}
              style={item.id === "upcoming" && upcomingDragOver ? {
                background: "var(--sage-pale)",
                border: "2px dashed var(--sage)",
                color: "var(--sage-deep)",
              } : {}}
            >
              {item.label}
            </div>
          ))}
        </nav>

        <div className="user-card">
          <div className="user-row">
            <div className="avatar">{initial}</div>
            <div>
              <div className="user-name">{user?.user_metadata?.full_name || "User"}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <nav className="mobile-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => navigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

export default Sidebar;