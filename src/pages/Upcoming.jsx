import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

// Pencil icon that opens a popover with both date-reschedule
// and repeat options for Upcoming tasks.
function EditPopover({ task, onSave }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(task.scheduled_date || "");
  const [repeat, setRepeat] = useState(task.repeat_type || "none");
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function save() {
    await supabase
      .from("tasks")
      .update({ scheduled_date: date || null, repeat_type: repeat })
      .eq("id", task.id);
    onSave();
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="delete-icon"
        title="Edit date & repeat"
        onClick={() => setOpen((o) => !o)}
        style={{ color: "var(--slate-light)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          background: "var(--paper-raised)", border: "1px solid var(--line)",
          borderRadius: "12px", boxShadow: "0 8px 24px rgba(28,33,40,0.12)",
          zIndex: 100, minWidth: "220px", padding: "14px",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "700",
            textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--slate-light)", marginBottom: "2px" }}>
            Reschedule
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", height: "34px", fontSize: "13px" }}
          />

          <div style={{ fontSize: "11px", fontWeight: "700",
            textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--slate-light)", marginTop: "4px" }}>
            Repeat
          </div>

          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            style={{ width: "100%", height: "34px", fontSize: "13px" }}
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <button onClick={save} style={{ marginTop: "2px" }}>Save</button>
        </div>
      )}
    </div>
  );
}

function Upcoming({ user }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  async function loadProjects() {
    if (!user) return;
    const { data } = await supabase
      .from("projects").select("*").eq("user_id", user.id).order("name");
    setProjects(data || []);
  }

  async function loadUpcomingTasks() {
    if (!user) return;

    const now = new Date();
    const today =
      now.getFullYear() +
      "-" + String(now.getMonth() + 1).padStart(2, "0") +
      "-" + String(now.getDate()).padStart(2, "0");

    const { data, error } = await supabase
      .from("tasks")
      .select(`*, folders (name), projects (id, name)`)
      .eq("user_id", user.id)
      .gt("scheduled_date", today)
      .neq("status", "Completed")
      .order("scheduled_date", { ascending: true });

    if (error) { console.error(error); return; }
    setTasks(data || []);
  }

  useEffect(() => {
    loadProjects();
    loadUpcomingTasks();
  }, [user]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  }

  function projectsForTask(task) {
    if (!task.folder_id) return [];
    return projects.filter((p) => String(p.folder_id) === String(task.folder_id));
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{
              fontSize: "13px", fontWeight: "700", color: "#4a5568",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {formatDate(date)}
            </span>
            <span style={{
              fontSize: "11px", color: "#8b938d", background: "#f0f0ec",
              borderRadius: "999px", padding: "2px 8px", fontWeight: "500",
            }}>
              {groupedTasks[date].length} task{groupedTasks[date].length !== 1 ? "s" : ""}
            </span>
          </div>

          {groupedTasks[date].map((task) => (
            <div key={task.id} className="task-row"
              style={{ display: "flex", alignItems: "center" }}>

              {/* Task info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "600" }}>{task.title}</div>

                <div style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {task.folders?.name && (
                    <span className="project-pill tag-folder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                      </svg>
                      {task.folders.name}
                    </span>
                  )}
                  {task.projects?.name && (
                    <span className="project-pill tag-project">
                      {task.projects.name}
                    </span>
                  )}
                  {task.repeat_type && task.repeat_type !== "none" && (
                    <span className="project-pill">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 2l4 4-4 4" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      {task.repeat_type}
                    </span>
                  )}
                  {task.source_url && (
                    <a href={task.source_url} target="_blank" rel="noreferrer"
                      className="project-pill" style={{ textDecoration: "none" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View in {task.source || "source"}
                    </a>
                  )}
                </div>
              </div>

              {/* Controls: project dropdown + pencil popover */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginLeft: "auto", flexShrink: 0,
              }}>
                <select
                  value={task.project_id || ""}
                  onChange={async (e) => {
                    await supabase.from("tasks")
                      .update({ project_id: e.target.value || null })
                      .eq("id", task.id);
                    loadUpcomingTasks();
                  }}
                  style={{ width: "130px", height: "32px", fontSize: "12px" }}
                >
                  <option value="">No project</option>
                  {projectsForTask(task).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <EditPopover task={task} onSave={loadUpcomingTasks} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Upcoming;