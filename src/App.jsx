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
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!session) return <Login />;

  function handleDragToUpcoming(taskId) {
    setRescheduleTaskId(taskId);
    setRescheduleDate("");
  }

  async function confirmReschedule() {
    if (!rescheduleDate || !rescheduleTaskId) return;
    await supabase.from("tasks").update({ scheduled_date: rescheduleDate }).eq("id", rescheduleTaskId);
    setRescheduleTaskId(null);
    setRescheduleDate("");
    // Stay on Today's page
  }

  function cancelReschedule() { setRescheduleTaskId(null); setRescheduleDate(""); }

  const PAGE_TITLES = {
    dashboard: "Today",
    upcoming: "Upcoming",
    projects: "Projects",
    archive: "Archive",
    captured: "Captured",
  };
  const PAGE_SUBS = {
    dashboard: "Clear what matters, leave the rest for later.",
    upcoming: "A gentle view of what's ahead.",
    projects: "Track progress across meaningful outcomes.",
    archive: "Completed work, safely stored away.",
    captured: "Newly arrived, waiting to be sorted.",
  };

  return (
    <div className="app">
      <Sidebar
        setCurrentPage={setCurrentPage}
        user={session.user}
        onDragToUpcoming={handleDragToUpcoming}
      />

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">{PAGE_TITLES[currentPage] || "Captur"}</h1>
            <div className="page-subtitle">{PAGE_SUBS[currentPage] || ""}</div>
          </div>
          <div className="topbar-clock">
            <div className="clock-date">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
            <div className="clock-time">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {currentPage === "dashboard" && <Dashboard user={session.user} onReschedule={handleDragToUpcoming} />}
        {currentPage === "upcoming" && <Upcoming user={session.user} />}
        {currentPage === "projects" && <Projects user={session.user} />}
        {currentPage === "archive" && <Archive user={session.user} />}
        {currentPage === "captured" && <Captured user={session.user} />}
      </main>

      {/* Drag-to-Upcoming reschedule modal */}
      {rescheduleTaskId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={cancelReschedule}
            style={{ position: "absolute", inset: 0, background: "rgba(28,33,40,0.18)" }} />
          <div style={{
            position: "relative", zIndex: 201,
            background: "var(--paper-raised)", border: "1px solid var(--line)",
            borderRadius: "16px", boxShadow: "0 16px 48px rgba(28,33,40,0.16)",
            padding: "24px 28px", minWidth: "280px", width: "calc(100% - 40px)", maxWidth: "340px",
          }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)", marginBottom: "6px" }}>
              Reschedule to Upcoming
            </div>
            <div style={{ fontSize: "13px", color: "var(--slate-light)", marginBottom: "18px" }}>
              Pick a date and this task will move to your Upcoming list.
            </div>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
              style={{ width: "100%", marginBottom: "14px" }} autoFocus />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={confirmReschedule} disabled={!rescheduleDate}
                style={{ flex: 1, opacity: rescheduleDate ? 1 : 0.5 }}>Reschedule</button>
              <button onClick={cancelReschedule} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;