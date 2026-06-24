import { useState } from "react";
import { supabase } from "../services/supabase";

function Sidebar({ setCurrentPage, user }) {
  const [activePage, setActivePage] = useState("dashboard");

  async function logout() {
    await supabase.auth.signOut();
  }

  function navigate(page) {
    setActivePage(page);
    setCurrentPage(page);
  }

  return (
    <aside
      className="sidebar"
      style={{
        width: "300px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div className="logo">
  Captur.
</div>

        <div
          className={`menu-item ${
            activePage === "dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("dashboard")}
        >
          Today
        </div>

        <div
          className={`menu-item ${
            activePage === "upcoming" ? "active" : ""
          }`}
          onClick={() => navigate("upcoming")}
        >
          Upcoming
        </div>

        <div
          className={`menu-item ${
            activePage === "projects" ? "active" : ""
          }`}
          onClick={() => navigate("projects")}
        >
          Projects
        </div>

        <div
          className={`menu-item ${
            activePage === "archive" ? "active" : ""
          }`}
          onClick={() => navigate("archive")}
        >
          Archive
        </div>

        <div
          className={`menu-item ${
            activePage === "captured" ? "active" : ""
          }`}
          onClick={() => navigate("captured")}
        >
          Captured
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #ddd",
          paddingTop: "16px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            marginBottom: "6px",
            fontWeight: "600",
          }}
        >
          {user?.user_metadata?.full_name || "User"}
        </div>

        <div
          style={{
            fontSize: "12px",
            opacity: 0.7,
            marginBottom: "12px",
          }}
        >
          {user?.email}
        </div>

        <button
          onClick={logout}
          style={{
            width: "100%",
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;