import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Upcoming from "./pages/Upcoming";
import Archive from "./pages/Archive";
import Captured from "./pages/Captured";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Drag-to-Upcoming reschedule state
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  // Bumped after a successful reschedule so Dashboard remounts and refetches
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session); }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!session) return <Login />;

  // Called by Sidebar when a task is dropped onto "Upcoming"
  function handleDragToUpcoming(taskId) {
    setRescheduleTaskId(taskId);
    setRescheduleDate("");
  }

  async function confirmReschedule() {
    if (!rescheduleDate || !rescheduleTaskId) return;

    await supabase
      .from("tasks")
      .update({ scheduled_date: rescheduleDate })
      .eq("id", rescheduleTaskId);

    setRescheduleTaskId(null);
    setRescheduleDate("");
    setDashboardRefreshKey((k) => k + 1); // triggers Dashboard remount/refetch
  }

  function cancelReschedule() {
    setRescheduleTaskId(null);
    setRescheduleDate("");
  }

  function getPageTitle() {
    switch (currentPage) {
      case "dashboard": return "Today";
      case "upcoming": return "Upcoming";
      case "projects": return "Projects";
      case "archive": return "Archive";
      case "captured": return "Captured";
      default: return "Captur";
    }
  }

  function getPageSubtitle() {
    switch (currentPage) {
      case "dashboard": return "Clear what matters, leave the rest for later.";
      case "upcoming": return "A gentle view of what's ahead.";
      case "projects": return "Track progress across meaningful outcomes.";
      case "archive": return "Completed work, safely stored away.";
      case "captured": return "Newly arrived, waiting to be sorted.";
      default: return "";
    }
  }

  return (
    <div className="app">
      <Sidebar
        setCurrentPage={setCurrentPage}
        user={session.user}
        onDragToUpcoming={handleDragToUpcoming}
      />

      <main className="main">
        <div className="topbar" style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: "32px",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "34px", fontWeight: "700",
              lineHeight: 1.1, color: "#1c2128" }}>
              {getPageTitle()}
            </h1>
            <div style={{ marginTop: "10px", fontSize: "16px", color: "#9aa1ac" }}>
              {getPageSubtitle()}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#6b7280" }}>
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
            <div style={{ marginTop: "6px", fontSize: "14px", color: "#9aa1ac" }}>
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {currentPage === "dashboard" && <Dashboard key={dashboardRefreshKey} user={session.user} />}
        {currentPage === "upcoming" && <Upcoming user={session.user} />}
        {currentPage === "projects" && <Projects user={session.user} />}
        {currentPage === "archive" && <Archive user={session.user} />}
        {currentPage === "captured" && <Captured user={session.user} />}
      </main>

      {/* ── Drag-to-Upcoming date picker modal ────────────────── */}
      {rescheduleTaskId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "flex-start",
          paddingLeft: "268px",    // sits beside the sidebar
        }}>
          {/* Backdrop */}
          <div
            onClick={cancelReschedule}
            style={{ position: "absolute", inset: 0, background: "rgba(28,33,40,0.18)" }}
          />

          {/* Picker card */}
          <div style={{
            position: "relative", zIndex: 201,
            background: "var(--paper-raised)", border: "1px solid var(--line)",
            borderRadius: "16px", boxShadow: "0 16px 48px rgba(28,33,40,0.16)",
            padding: "24px 28px", minWidth: "280px",
          }}>
            <div style={{ fontSize: "15px", fontWeight: "700",
              color: "var(--ink)", marginBottom: "6px" }}>
              Reschedule to Upcoming
            </div>
            <div style={{ fontSize: "13px", color: "var(--slate-light)",
              marginBottom: "18px" }}>
              Pick a date and this task will move to your Upcoming list.
            </div>

            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              style={{ width: "100%", marginBottom: "14px" }}
              autoFocus
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={confirmReschedule}
                disabled={!rescheduleDate}
                style={{ flex: 1, opacity: rescheduleDate ? 1 : 0.5 }}
              >
                Reschedule
              </button>
              <button
                onClick={cancelReschedule}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;