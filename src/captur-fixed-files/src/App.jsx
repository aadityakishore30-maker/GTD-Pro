import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Upcoming from "./pages/Upcoming";
import Archive from "./pages/Archive";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!session) {
    return <Login />;
  }

  function getPageTitle() {
    switch (currentPage) {
      case "dashboard":
        return "Today";

      case "upcoming":
        return "Upcoming";

      case "projects":
        return "Projects";

      case "archive":
        return "Archive";

      default:
        return "Captur";
    }
  }

  function getPageSubtitle() {
    switch (currentPage) {
      case "dashboard":
        return "Clear what matters, leave the rest for later.";

      case "upcoming":
        return "A gentle view of what's ahead.";

      case "projects":
        return "Track progress across meaningful outcomes.";

      case "archive":
        return "Completed work, safely stored away.";

      default:
        return "";
    }
  }

  return (
    <div className="app">
      <Sidebar setCurrentPage={setCurrentPage} user={session.user} />

      <main className="main">
        <div
          className="topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
  style={{
    margin: 0,
    fontSize: "34px",
    fontWeight: "700",
    lineHeight: 1.1,
    color: "#1c2128",
  }}
>
  {getPageTitle()}
</h1>

            <div
              style={{
                marginTop: "10px",
                fontSize: "16px",
                color: "#9aa1ac",
              }}
            >
              {getPageSubtitle()}
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#6b7280",
              }}
            >
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            <div
              style={{
                marginTop: "6px",
                fontSize: "14px",
                color: "#9aa1ac",
              }}
            >
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {currentPage === "dashboard" && <Dashboard user={session.user} />}

        {currentPage === "upcoming" && <Upcoming user={session.user} />}

        {currentPage === "projects" && <Projects user={session.user} />}

        {currentPage === "archive" && <Archive user={session.user} />}
      </main>
    </div>
  );
}

export default App;