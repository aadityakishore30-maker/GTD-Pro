import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import FolderManager from "../components/FolderManager";
import TaskManager from "../components/TaskManager";

function Dashboard({ user, onReschedule }) {
  const [totalToday, setTotalToday] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [pendingOrganize, setPendingOrganize] = useState(0);
  const [percentDone, setPercentDone] = useState(0);

  function localDateStr(d) {
    const dt = new Date(d);
    return dt.getFullYear() + "-" +
      String(dt.getMonth() + 1).padStart(2, "0") + "-" +
      String(dt.getDate()).padStart(2, "0");
  }

  function isTaskForToday(task, todayStr) {
    const isRepeating = task.repeat_type && task.repeat_type !== "none";
    if (isRepeating) {
      if (task.repeat_type === "daily") return true;
      if (task.repeat_type === "weekly") {
        return new Date().getDay() === new Date(task.scheduled_date).getDay();
      }
      if (task.repeat_type === "monthly") {
        return new Date().getDate() === new Date(task.scheduled_date).getDate();
      }
      return true;
    }
    if (!task.scheduled_date) {
      // No-date backlog task: it belongs to "today" only while still open,
      // or on the specific day it got completed — not forever after.
      if (task.status?.toLowerCase() === "completed") {
        return !!task.completed_at && localDateStr(task.completed_at) === todayStr;
      }
      return true;
    }
    return task.scheduled_date === todayStr;
  }

  function isCompletedToday(task, todayStr) {
    const isRepeating = task.repeat_type && task.repeat_type !== "none";
    if (isRepeating) return task.last_completed_date === todayStr;
    return (
      task.status?.toLowerCase() === "completed" &&
      !!task.completed_at &&
      localDateStr(task.completed_at) === todayStr
    );
  }

  async function loadSummary() {
    if (!user) return;

    const now = new Date();
    const today =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    const { data: allTasks, error } = await supabase
      .from("tasks").select("*").eq("user_id", user.id)
      .not("folder_id", "is", null);

    if (error) { console.error(error); return; }
    const tasks = allTasks || [];

    const todaysTasks = tasks.filter((t) => isTaskForToday(t, today));
    setTotalToday(todaysTasks.length);

    const upcoming = tasks.filter((t) =>
      t.scheduled_date && t.scheduled_date > today && t.status?.toLowerCase() !== "completed"
    );
    setUpcomingCount(upcoming.length);

    const completed = todaysTasks.filter((t) => isCompletedToday(t, today));
    setCompletedToday(completed.length);

    setPercentDone(todaysTasks.length > 0
      ? Math.round((completed.length / todaysTasks.length) * 100) : 0);

    const { count } = await supabase
      .from("tasks").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("folder_id", null);
    setPendingOrganize(count || 0);
  }

  useEffect(() => { loadSummary(); }, [user]);

  const cards = [
    { label: "Today's Tasks", value: totalToday },
    { label: "Upcoming", value: upcomingCount },
    { label: "Completed Today", value: completedToday },
    { label: "Pending to Organize", value: pendingOrganize },
    { label: "% Done Today", value: `${percentDone}%` },
  ];

  return (
    <div>
      {/* Summary cards — 5 cols desktop, 2 cols mobile */}
      <div className="summary-grid" style={{ marginBottom: "28px" }}>
        {cards.map((c) => (
          <div key={c.label} className="card summary-card">
            <div className="summary-label">{c.label}</div>
            <div className="summary-number">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Main content — 2 cols desktop, 1 col mobile */}
      <div className="dashboard-grid">
        <FolderManager user={user} />
        <TaskManager user={user} onReschedule={onReschedule} />
      </div>
    </div>
  );
}

export default Dashboard;