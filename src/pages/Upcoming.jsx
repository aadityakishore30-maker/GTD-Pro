import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { SelectPopover, DatePopover, RepeatPopover } from "../components/Popovers";

function Upcoming({ user }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  async function loadProjects() {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name");
    setProjects(data || []);
  }

  async function loadUpcomingTasks() {
    if (!user) return;
    const now = new Date();
    const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    const { data, error } = await supabase
      .from("tasks").select(`*, folders (name), projects (id, name)`)
      .eq("user_id", user.id).gt("scheduled_date", today)
      .neq("status", "Completed").order("scheduled_date", { ascending: true });
    if (error) { console.error(error); return; }
    setTasks(data || []);
  }

  useEffect(() => { loadProjects(); loadUpcomingTasks(); }, [user]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {formatDate(date)}
            </span>
            <span style={{ fontSize: "11px", color: "#8b938d", background: "#f0f0ec", borderRadius: "999px", padding: "2px 8px", fontWeight: "500" }}>
              {groupedTasks[date].length} task{groupedTasks[date].length !== 1 ? "s" : ""}
            </span>
          </div>

          {groupedTasks[date].map((task) => {
            const taskProjectOptions = [
              { value: "", label: "No project" },
              ...projectsForTask(task).map((p) => ({ value: String(p.id), label: p.name })),
            ];

            return (
              <div key={task.id} className="task-row" style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>{task.title}</div>
                  <div style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {task.folders?.name && (
                      <span className="project-pill tag-folder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                        </svg>
                        {task.folders.name}
                      </span>
                    )}
                    {task.projects?.name && (
                      <span className="project-pill tag-project">{task.projects.name}</span>
                    )}
                    {task.repeat_type && task.repeat_type !== "none" && (
                      <span className="project-pill">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        {task.repeat_type}
                      </span>
                    )}
                    {task.source_url && (
                      <a href={task.source_url} target="_blank" rel="noreferrer" className="project-pill" style={{ textDecoration: "none" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        View in {task.source || "source"}
                      </a>
                    )}
                  </div>
                </div>

                {/* Inline controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto", flexShrink: 0 }}>
                  <div style={{ width: "140px" }}>
                    <SelectPopover
                      value={String(task.project_id || "")}
                      onChange={async (val) => {
                        await supabase.from("tasks").update({ project_id: val || null }).eq("id", task.id);
                        loadUpcomingTasks();
                      }}
                      options={taskProjectOptions} placeholder="No project" size="sm"
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <DatePopover
                      value={task.scheduled_date || ""}
                      onChange={async (val) => {
                        await supabase.from("tasks").update({ scheduled_date: val || null }).eq("id", task.id);
                        loadUpcomingTasks();
                      }}
                      placeholder="Reschedule" size="sm"
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <RepeatPopover
                      value={task.repeat_type || "none"}
                      onChange={async (val) => {
                        await supabase.from("tasks").update({ repeat_type: val }).eq("id", task.id);
                        loadUpcomingTasks();
                      }}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default Upcoming;