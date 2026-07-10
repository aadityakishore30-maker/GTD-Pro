import { useState } from "react";
import { supabase } from "../services/supabase";
import logo from "../assets/Screenshot_2026-06-19_143129-removebg-preview.webp";

function Sidebar({ setCurrentPage, user, onDragToUpcoming }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [upcomingDragOver, setUpcomingDragOver] = useState(false);

  function navigate(page) {
    setActivePage(page);
    setCurrentPage(page);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // ── Drag-to-Upcoming handlers ──────────────────────────────
  function handleUpcomingDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setUpcomingDragOver(true);
  }

  function handleUpcomingDragLeave() {
    setUpcomingDragOver(false);
  }

  function handleUpcomingDrop(e) {
    e.preventDefault();
    setUpcomingDragOver(false);

    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && onDragToUpcoming) {
      onDragToUpcoming(taskId);
    }
  }

  const initial = user?.email
    ? user.email[0].toUpperCase()
    : "U";

  return (
    <aside
      className="sidebar"
      style={{ width: "248px", minHeight: "100vh" }}
    >
      <div className="logo">
        <img src={logo} alt="Captur." />
      </div>

      <nav>
        <div
          className={`menu-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => navigate("dashboard")}
        >
          Today
        </div>

        {/* "Upcoming" accepts task drops from TaskManager */}
        <div
          className={`menu-item ${activePage === "upcoming" ? "active" : ""}`}
          onClick={() => navigate("upcoming")}
          onDragOver={handleUpcomingDragOver}
          onDragLeave={handleUpcomingDragLeave}
          onDrop={handleUpcomingDrop}
          style={upcomingDragOver ? {
            background: "var(--sage-pale)",
            border: "2px dashed var(--sage)",
            color: "var(--sage-deep)",
          } : {}}
        >
          Upcoming
        </div>

        <div
          className={`menu-item ${activePage === "projects" ? "active" : ""}`}
          onClick={() => navigate("projects")}
        >
          Projects
        </div>

        <div
          className={`menu-item ${activePage === "captured" ? "active" : ""}`}
          onClick={() => navigate("captured")}
        >
          Captured
        </div>

        <div
          className={`menu-item ${activePage === "archive" ? "active" : ""}`}
          onClick={() => navigate("archive")}
        >
          Archive
        </div>
      </nav>

      <div className="user-card">
        <div className="user-row">
          <div className="avatar">{initial}</div>
          <div>
            <div className="user-name">
              {user?.user_metadata?.full_name || "User"}
            </div>
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
  );
}

export default Sidebar;