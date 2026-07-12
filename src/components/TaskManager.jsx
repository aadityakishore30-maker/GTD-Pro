import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";
import { SelectPopover, RepeatPopover, PencilPopover } from "./Popover";

function TaskManager({ user }) {
  const [folders, setFolders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(localStorage.getItem("selectedFolder") || "");
  const [selectedProject, setSelectedProject] = useState("");
  const [taskName, setTaskName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [repeatType, setRepeatType] = useState("none");
  const [taskPendingDelete, setTaskPendingDelete] = useState(null);
  const dragIndex = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  async function loadFolders() {
    if (!user) return;
    const { data } = await supabase.from("folders").select("*").eq("user_id", user.id).order("name");
    setFolders(data || []);
    const saved = localStorage.getItem("selectedFolder");
    if (saved && data?.some((f) => String(f.id) === String(saved))) {
      setSelectedFolder(saved);
    } else if (data?.length > 0 && !selectedFolder) {
      setSelectedFolder(data[0].id);
    }
  }

  async function loadProjects() {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name");
    setProjects(data || []);
  }

  async function loadTasks(folderId) {
    if (!folderId || !user) return;
    const { data } = await supabase
      .from("tasks").select(`*, projects (id, name)`)
      .eq("folder_id", folderId).eq("user_id", user.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function createTask() {
    if (!taskName.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert([{
      title: taskName, folder_id: selectedFolder, user_id: user.id,
      project_id: selectedProject || null,
      scheduled_date: scheduledDate || null,
      original_scheduled_date: scheduledDate || null,
      repeat_type: repeatType, status: "Inbox",
    }]);
    if (error) { alert(error.message); return; }
    setTaskName(""); setSelectedProject(""); setScheduledDate(""); setRepeatType("none");
    await loadTasks(selectedFolder);
  }

  async function completeTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isRepeating = task.repeat_type && task.repeat_type !== "none";
    if (isRepeating) {
      await supabase.from("tasks").update({ last_completed_date: today, completed_at: new Date().toISOString() }).eq("id", taskId);
    } else {
      await supabase.from("tasks").update({ status: "Completed", completed_at: new Date().toISOString() }).eq("id", taskId);
    }
    loadTasks(selectedFolder);
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { alert(error.message); return; }
    setTaskPendingDelete(null);
    loadTasks(selectedFolder);
  }

  function handleDragStart(e, index, task) {
    dragIndex.current = index;
    setDraggingIndex(index);
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(index) { setDragOverIndex(index); }

  function handleDrop(dropIndex) {
    const from = dragIndex.current;
    // Always clear drag state immediately and synchronously — never wait on
    // a network call to do this, or the row sits dimmed/unresponsive until
    // the request resolves (or forever, if it silently fails).
    dragIndex.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);

    if (from === null || from === dropIndex) return;

    const reordered = [...activeTasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);

    // Optimistic UI: reflect the new order right away instead of waiting
    // on Supabase, then persist in the background.
    setTasks((prev) => {
      const reorderedIds = reordered.map((t) => t.id);
      const rest = prev.filter((t) => !reorderedIds.includes(t.id));
      const reorderedWithSort = reordered.map((t, idx) => ({ ...t, sort_order: idx }));
      return [...reorderedWithSort, ...rest];
    });

    Promise.all(
      reordered.map((task, idx) =>
        supabase.from("tasks").update({ sort_order: idx }).eq("id", task.id)
      )
    )
      .then(() => loadTasks(selectedFolder))
      .catch((err) => {
        console.error("Failed to save reorder:", err);
        loadTasks(selectedFolder); // resync with server truth on failure
      });
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  // Safety net: if a drop happens somewhere the row's own handlers don't
  // cover (e.g. the browser cancels the drag, or focus/DOM changes mid-drag
  // suppress the row's dragend), this guarantees the dimmed/dragging state
  // never gets stuck indefinitely.
  useEffect(() => {
    function clearDragState() {
      dragIndex.current = null;
      setDraggingIndex(null);
      setDragOverIndex(null);
    }
    window.addEventListener("dragend", clearDragState);
    window.addEventListener("drop", clearDragState);
    return () => {
      window.removeEventListener("dragend", clearDragState);
      window.removeEventListener("drop", clearDragState);
    };
  }, []);

  useEffect(() => { loadFolders(); loadProjects(); }, [user]);
  useEffect(() => {
    if (selectedFolder) { localStorage.setItem("selectedFolder", selectedFolder); loadTasks(selectedFolder); }
  }, [selectedFolder]);

  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  const activeTasks = tasks.filter((task) => {
    const isRepeating = task.repeat_type && task.repeat_type !== "none";
    if (isRepeating) { if (task.last_completed_date === today) return false; }
    else if (task.status?.toLowerCase() === "completed") return false;
    if (selectedProject && String(task.project_id) !== String(selectedProject)) return false;
    if (!task.scheduled_date) return true;
    if (task.repeat_type === "daily") return true;
    if (task.repeat_type === "weekly") return new Date().getDay() === new Date(task.scheduled_date).getDay();
    if (task.repeat_type === "monthly") return new Date().getDate() === new Date(task.scheduled_date).getDate();
    return task.scheduled_date === today;
  });

  const folderProjects = projects.filter((p) => String(p.folder_id) === String(selectedFolder));
  const folderOptions = folders.map((f) => ({ value: String(f.id), label: f.name }));
  const projectOptions = [
    { value: "", label: "No project" },
    ...folderProjects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  const REPEAT_LABELS = { none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>Today's Tasks</h2>

      <div style={{ marginBottom: "20px", width: "180px" }}>
        <SelectPopover value={String(selectedFolder)} onChange={setSelectedFolder} options={folderOptions} placeholder="Select folder" />
      </div>

      {/* ── New task row ── */}
      <div className="task-create-row" style={{ display: "flex", gap: "10px", marginBottom: "24px", alignItems: "center" }}>
        <input
          value={taskName} onChange={(e) => setTaskName(e.target.value)}
          placeholder="New task..." onKeyDown={(e) => e.key === "Enter" && createTask()}
          style={{ flex: 1, minWidth: "160px" }}
        />

        <div style={{ width: "150px" }}>
          <SelectPopover value={selectedProject} onChange={setSelectedProject} options={projectOptions} placeholder="Project" />
        </div>

        {selectedProject && (
          <button onClick={() => setSelectedProject("")} className="delete-icon" title="Clear filter" style={{ fontSize: "16px", fontWeight: "700" }}>✕</button>
        )}

        {/* Native date input — shows dd-mm-yyyy placeholder, single click opens picker */}
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          style={{ width: "150px" }}
        />

        <div style={{ width: "130px" }}>
          <RepeatPopover value={repeatType} onChange={setRepeatType} />
        </div>

        <button onClick={createTask}>Add</button>
      </div>

      {activeTasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#8b938d" }}>
          {selectedProject ? "No tasks for this project today" : "No tasks scheduled for today"}
        </div>
      )}

      {activeTasks.map((task, index) => (
        <div
          key={task.id} className="task-row" draggable
          onDragStart={(e) => handleDragStart(e, index, task)}
          onDragEnter={() => handleDragEnter(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)} onDragEnd={handleDragEnd}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            opacity: draggingIndex === index ? 0.4 : 1,
            borderTop: dragOverIndex === index && draggingIndex !== index
              ? "2px solid var(--sage)" : "2px solid transparent",
            transition: "border-color 0.1s ease, opacity 0.1s ease",
          }}
        >
          {/* Drag handle — dragging only ever starts from here now */}
          <div className="drag-handle" title="Drag to reorder">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>

          <input type="checkbox" draggable={false} onChange={() => completeTask(task.id)} />

          {/* Task info */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>{task.title}</div>
            {task.source_url && (
              <a href={task.source_url} target="_blank" rel="noreferrer" draggable={false}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--sage-deep)", marginTop: "4px", textDecoration: "none" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View in {task.source || "source"}
              </a>
            )}
            {task.repeat_type && task.repeat_type !== "none" && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#8b938d", marginTop: "4px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {task.repeat_type}
              </div>
            )}
          </div>

          {/* Controls: project + pencil for repeat + delete */}
          <div className="task-row-controls" draggable={false} style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div style={{ width: "140px" }} draggable={false}>
              <SelectPopover
                value={String(task.project_id || "")}
                onChange={async (val) => {
                  await supabase.from("tasks").update({ project_id: val || null }).eq("id", task.id);
                  loadTasks(selectedFolder);
                }}
                options={projectOptions} placeholder="No project" size="sm"
              />
            </div>

            {/* Pencil → repeat popover */}
            <div draggable={false} style={{ display: "flex" }}>
            <PencilPopover active={task.repeat_type && task.repeat_type !== "none"}>
              {({ close }) => (
                <div style={{ padding: "6px 0" }}>
                  {["none", "daily", "weekly", "monthly"].map((val) => (
                    <div
                      key={val}
                      onClick={async () => {
                        await supabase.from("tasks").update({ repeat_type: val }).eq("id", task.id);
                        loadTasks(selectedFolder);
                        close();
                      }}
                      style={{
                        padding: "10px 14px", fontSize: "13px", cursor: "pointer",
                        fontWeight: (task.repeat_type || "none") === val ? "600" : "400",
                        color: (task.repeat_type || "none") === val ? "var(--sage-deep)" : "var(--ink-soft)",
                        background: (task.repeat_type || "none") === val ? "var(--sage-pale)" : "transparent",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}
                      onMouseEnter={(e) => { if ((task.repeat_type || "none") !== val) e.currentTarget.style.background = "rgba(28,33,40,0.04)"; }}
                      onMouseLeave={(e) => { if ((task.repeat_type || "none") !== val) e.currentTarget.style.background = "transparent"; }}
                    >
                      {(task.repeat_type || "none") === val && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {(task.repeat_type || "none") !== val && <span style={{ width: 13 }} />}
                      {REPEAT_LABELS[val]}
                    </div>
                  ))}
                </div>
              )}
            </PencilPopover>
            </div>

            <button className="delete-icon" draggable={false} title="Delete task" onClick={() => setTaskPendingDelete(task)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
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