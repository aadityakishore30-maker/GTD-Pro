import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Upcoming({ user }) {
  const [tasks, setTasks] = useState([]);

  async function loadUpcomingTasks() {
    if (!user) return;

    const now = new Date();

    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        folders (
          name
        ),
        projects (
          name
        )
      `)
      .eq("user_id", user.id)
      .gt("scheduled_date", today)
      .neq("status", "Completed")
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTasks(data || []);
  }

  useEffect(() => {
    loadUpcomingTasks();
  }, [user]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Group tasks by scheduled_date
  const groupedTasks = tasks.reduce((acc, task) => {
    const date = task.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedTasks).sort();

  return (
    <div>
      {sortedDates.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "#8b938d" }}>
          No upcoming tasks scheduled.
        </div>
      )}

      {sortedDates.map((date) => (
        <div key={date} className="card" style={{ marginBottom: "16px" }}>
          {/* Date header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#4a5568",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {formatDate(date)}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#8b938d",
                background: "#f0f0ec",
                borderRadius: "999px",
                padding: "2px 8px",
                fontWeight: "500",
              }}
            >
              {groupedTasks[date].length} task{groupedTasks[date].length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Tasks for this date */}
          {groupedTasks[date].map((task) => (
            <div
              key={task.id}
              className="task-row"
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {task.title}
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {task.folders?.name && (
                    <span className="project-pill tag-folder">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                      </svg>
                      {task.folders.name}
                    </span>
                  )}

                  {task.projects?.name && (
                    <span className="project-pill tag-project">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="8" />
                      </svg>
                      {task.projects.name}
                    </span>
                  )}

                  {task.repeat_type && task.repeat_type !== "none" && (
                    <span className="project-pill">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17 2l4 4-4 4" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      {task.repeat_type}
                    </span>
                  )}

                  {task.source_url && (
                    <a
                      href={task.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="project-pill"
                      style={{ textDecoration: "none" }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View in {task.source || "source"}
                    </a>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginLeft: "auto",
                }}
              >
                <input
                  type="date"
                  value={task.scheduled_date || ""}
                  onChange={async (e) => {
                    await supabase
                      .from("tasks")
                      .update({ scheduled_date: e.target.value })
                      .eq("id", task.id);
                    loadUpcomingTasks();
                  }}
                  style={{
                    width: "140px",
                    height: "32px",
                    fontSize: "12px",
                  }}
                />

                <select
                  value={task.repeat_type || "none"}
                  onChange={async (e) => {
                    await supabase
                      .from("tasks")
                      .update({ repeat_type: e.target.value })
                      .eq("id", task.id);
                    loadUpcomingTasks();
                  }}
                  style={{
                    width: "90px",
                    height: "32px",
                    fontSize: "12px",
                  }}
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Upcoming;