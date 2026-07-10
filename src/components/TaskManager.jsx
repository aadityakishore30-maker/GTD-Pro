import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";

// Small pencil-icon button that toggles a popover for repeat
// selection — keeps the task row uncluttered.
function RepeatPopover({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close if the user clicks anywhere outside the popover.
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const options = [
    { value: "none", label: "No repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="icon-btn"
        title="Edit repeat"
        onClick={() => setOpen((o) => !o)}
        style={{
          color: value && value !== "none"
            ? "var(--sage-deep)"
            : "var(--slate)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            background: "var(--paper-raised)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(28,33,40,0.12)",
            zIndex: 100,
            minWidth: "140px",
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: value === opt.value ? "600" : "400",
                color: value === opt.value
                  ? "var(--sage-deep)"
                  : "var(--ink-soft)",
                background: value === opt.value
                  ? "var(--sage-pale)"
                  : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value)
                  e.currentTarget.style.background = "rgba(28,33,40,0.04)";
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskManager({ user }) {
  const [folders, setFolders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedFolder, setSelectedFolder] = useState(
    localStorage.getItem("selectedFolder") || ""
  );

  const [selectedProject, setSelectedProject] = useState("");
  const [taskName, setTaskName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [repeatType, setRepeatType] = useState("none");
  const [taskPendingDelete, setTaskPendingDelete] = useState(null);

  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  async function loadFolders() {
    if (!user) return;

    const { data } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    setFolders(data || []);

    const savedFolder = localStorage.getItem("selectedFolder");

    if (
      savedFolder &&
      data?.some((f) => String(f.id) === String(savedFolder))
    ) {
      setSelectedFolder(savedFolder);
    } else if (data?.length > 0 && !selectedFolder) {
      setSelectedFolder(data[0].id);
    }
  }

  async function loadProjects() {
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    setProjects(data || []);
  }

  async function loadTasks(folderId) {
    if (!folderId || !user) return;

    const { data } = await supabase
      .from("tasks")
      .select(`*, projects (id, name)`)
      .eq("folder_id", folderId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    setTasks(data || []);
  }

  async function createTask() {
    if (!taskName.trim() || !user) return;

    const { error } = await supabase.from("tasks").insert([{
      title: taskName,
      folder_id: selectedFolder,
      user_id: user.id,
      project_id: selectedProject || null,
      scheduled_date: scheduledDate || null,
      original_scheduled_date: scheduledDate || null,
      repeat_type: repeatType,
      status: "Inbox",
    }]);

    if (error) { alert(error.message); return; }

    setTaskName("");
    setSelectedProject("");
    setScheduledDate("");
    setRepeatType("none");
    await loadTasks(selectedFolder);
  }

  async function completeTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isRepeating = task.repeat_type && task.repeat_type !== "none";

    if (isRepeating) {
      await supabase.from("tasks").update({
        last_completed_date: today,
        completed_at: new Date().toISOString(),
      }).eq("id", taskId);
    } else {
      await supabase.from("tasks").update({
        status: "Completed",
        completed_at: new Date().toISOString(),
      }).eq("id", taskId);
    }

    loadTasks(selectedFolder);
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { alert(error.message); return; }
    setTaskPendingDelete(null);
    loadTasks(selectedFolder);
  }

  // ── Drag-to-reorder within the list ──────────────────────────

  function handleDragStart(e, index, task) {
    dragIndex.current = index;
    // Store task ID so the Sidebar can pick it up if the user
    // drops onto "Upcoming".
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.setData("taskTitle", task.title);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(index) {
    setDragOverIndex(index);
  }

  async function handleDrop(dropIndex) {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }

    const reordered = [...activeTasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);

    await Promise.all(
      reordered.map((task, idx) =>
        supabase.from("tasks").update({ sort_order: idx }).eq("id", task.id)
      )
    );

    dragIndex.current = null;
    setDragOverIndex(null);
    loadTasks(selectedFolder);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  useEffect(() => { loadFolders(); loadProjects(); }, [user]);

  useEffect(() => {
    if (selectedFolder) {
      localStorage.setItem("selectedFolder", selectedFolder);
      loadTasks(selectedFolder);
    }
  }, [selectedFolder]);

  const now = new Date();
  const today =
    now.getFullYear() +
    "-" + String(now.getMonth() + 1).padStart(2, "0") +
    "-" + String(now.getDate()).padStart(2, "0");

  const activeTasks = tasks.filter((task) => {
    const isRepeating = task.repeat_type && task.repeat_type !== "none";

    if (isRepeating) {
      if (task.last_completed_date === today) return false;
    } else if (task.status?.toLowerCase() === "completed") {
      return false;
    }

    // Project filter — when a project is selected in the dropdown,
    // only show tasks that belong to that project.
    if (selectedProject && String(task.project_id) !== String(selectedProject)) {
      return false;
    }

    if (!task.scheduled_date) return true;
    if (task.repeat_type === "daily") return true;

    if (task.repeat_type === "weekly") {
      return new Date().getDay() === new Date(task.scheduled_date).getDay();
    }
    if (task.repeat_type === "monthly") {
      return new Date().getDate() === new Date(task.scheduled_date).getDate();
    }

    return task.scheduled_date === today;
  });

  const folderProjects = projects.filter(
    (p) => String(p.folder_id) === String(selectedFolder)
  );

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>Today's Tasks</h2>

      <select
        value={selectedFolder}
        onChange={(e) => setSelectedFolder(e.target.value)}
        style={{ marginBottom: "20px" }}
      >
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>{folder.name}</option>
        ))}
      </select>

      {/* New task row */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "24px",
        alignItems: "center",
      }}>
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="New task..."
          onKeyDown={(e) => e.key === "Enter" && createTask()}
          style={{ flex: 1, minWidth: "160px" }}
        />
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Project</option>
          {folderProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Show a small "filtering" hint when a project is selected */}
        {selectedProject && (
          <button
            onClick={() => setSelectedProject("")}
            className="btn-ghost"
            title="Clear project filter"
            style={{
              padding: "0 10px",
              height: "34px",
              minHeight: "unset",
              fontSize: "12px",
              color: "var(--sage-deep)",
              borderColor: "var(--sage)",
            }}
          >
            ✕ clear filter
          </button>
        )}
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <select
          value={repeatType}
          onChange={(e) => setRepeatType(e.target.value)}
        >
          <option value="none">No Repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button onClick={createTask}>Add</button>
      </div>

      {activeTasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#8b938d" }}>
          {selectedProject
            ? "No tasks for this project today"
            : "No tasks scheduled for today"}
        </div>
      )}

      {activeTasks.map((task, index) => (
        <div
          key={task.id}
          className="task-row"
          draggable
          onDragStart={(e) => handleDragStart(e, index, task)}
          onDragEnter={() => handleDragEnter(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            opacity: dragIndex.current === index ? 0.4 : 1,
            borderTop:
              dragOverIndex === index && dragIndex.current !== index
                ? "2px solid var(--sage)"
                : "2px solid transparent",
            transition: "border-color 0.1s ease",
          }}
        >
          {/* Drag handle */}
          <div className="drag-handle" title="Drag to reorder or drop onto Upcoming">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>

          <input type="checkbox" onChange={() => completeTask(task.id)} />

          {/* Task info */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>{task.title}</div>

            {task.source_url && (
              <a href={task.source_url} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "12px", color: "var(--sage-deep)", marginTop: "4px",
                  textDecoration: "none",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View in {task.source || "source"}
              </a>
            )}

            {task.repeat_type && task.repeat_type !== "none" && (
              <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontSize: "12px", color: "#8b938d", marginTop: "4px",
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {task.repeat_type}
              </div>
            )}
          </div>

          {/* Inline controls — project + pencil for repeat + delete */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <select
              value={task.project_id || ""}
              onChange={async (e) => {
                await supabase.from("tasks")
                  .update({ project_id: e.target.value || null })
                  .eq("id", task.id);
                loadTasks(selectedFolder);
              }}
              style={{ width: "130px", height: "32px", fontSize: "12px" }}
            >
              <option value="">No project</option>
              {folderProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <RepeatPopover
              value={task.repeat_type || "none"}
              onChange={async (val) => {
                await supabase.from("tasks")
                  .update({ repeat_type: val })
                  .eq("id", task.id);
                loadTasks(selectedFolder);
              }}
            />

            <button
              className="delete-icon"
              title="Delete task"
              onClick={() => setTaskPendingDelete(task)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" /><path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={taskPendingDelete !== null}
        title="Delete this task?"
        message="This will permanently delete this task. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTask(taskPendingDelete.id)}
        onCancel={() => setTaskPendingDelete(null)}
      />
    </div>
  );
}

export default TaskManager;