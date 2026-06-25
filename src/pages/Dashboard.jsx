import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import FolderManager from "../components/FolderManager";
import TaskManager from "../components/TaskManager";

function Dashboard({ user }) {
  const [totalToday, setTotalToday] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [pendingOrganize, setPendingOrganize] = useState(0);
  const [percentDone, setPercentDone] = useState(0);

  // Same recurrence-aware "is this task relevant today" check used
  // in TaskManager.jsx, kept in sync so both views agree on what
  // counts as a today's task.
  function isTaskForToday(task, todayStr) {
    if (!task.scheduled_date) {
      return true;
    }

    if (task.repeat_type === "daily") {
      return true;
    }

    if (task.repeat_type === "weekly") {
      const todayDay = new Date().getDay();
      const taskDay = new Date(task.scheduled_date).getDay();
      return todayDay === taskDay;
    }

    if (task.repeat_type === "monthly") {
      const todayDate = new Date().getDate();
      const taskDate = new Date(task.scheduled_date).getDate();
      return todayDate === taskDate;
    }

    return task.scheduled_date === todayStr;
  }

  async function loadSummary() {
    if (!user) return;

    const now = new Date();
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const { data: allTasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .not("folder_id", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    const tasks = allTasks || [];

    // Card 1: total today's tasks across every folder/project,
    // including ones already completed.
    const todaysTasks = tasks.filter((task) =>
      isTaskForToday(task, today)
    );
    setTotalToday(todaysTasks.length);

    // Card 2: upcoming tasks, matching the same definition
    // Upcoming.jsx uses (strictly after today, not completed).
    const upcoming = tasks.filter(
      (task) =>
        task.scheduled_date &&
        task.scheduled_date > today &&
        task.status?.toLowerCase() !== "completed"
    );
    setUpcomingCount(upcoming.length);

    // Card 3: today's tasks that are completed. Repeating tasks
    // are "completed" for today specifically via last_completed_date;
    // one-time tasks use the permanent status field.
    const completed = todaysTasks.filter((task) => {
      const isRepeating =
        task.repeat_type && task.repeat_type !== "none";

      if (isRepeating) {
        return task.last_completed_date === today;
      }

      return task.status?.toLowerCase() === "completed";
    });
    setCompletedToday(completed.length);

    // Card 4: items captured from Gmail/Chat that haven't been
    // organized yet (no folder assigned). Queried separately
    // since the main task list above deliberately excludes them.
    const { count: pendingCount, error: pendingError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("folder_id", null);

    if (pendingError) {
      console.error(pendingError);
    } else {
      setPendingOrganize(pendingCount || 0);
    }

    // Card 5: percentage of today's scheduled tasks completed.
    const percent =
      todaysTasks.length > 0
        ? Math.round(
            (completed.length / todaysTasks.length) * 100
          )
        : 0;
    setPercentDone(percent);
  }

  useEffect(() => {
    loadSummary();
  }, [user]);

  return (
    <div>
      {/* Summary Cards */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        <div className="card summary-card">
          <div className="summary-label">Today's Tasks</div>
          <div className="summary-number">{totalToday}</div>
        </div>

        <div className="card summary-card">
          <div className="summary-label">Upcoming</div>
          <div className="summary-number">{upcomingCount}</div>
        </div>

        <div className="card summary-card">
          <div className="summary-label">Completed Today</div>
          <div className="summary-number">{completedToday}</div>
        </div>

        <div className="card summary-card">
          <div className="summary-label">Pending to Organize</div>
          <div className="summary-number">{pendingOrganize}</div>
        </div>

        <div className="card summary-card">
          <div className="summary-label">% Done Today</div>
          <div className="summary-number">{percentDone}%</div>
        </div>
      </div>

      {/* Main Content */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <FolderManager user={user} />
        <TaskManager user={user} />
      </div>
    </div>
  );
}

export default Dashboard;