import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";
import { SelectPopover, DatePopover, RepeatPopover } from "./Popover";

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
  const [editingId, setEditingId] = useState(null);
  const dragIndex = useRef(null);
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
      project_id: selectedProject || null, scheduled_date: scheduledDate || null,
      original_scheduled_date: scheduledDate || null, repeat_type: repeatType, status: "Inbox",
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

  async function updateTaskField(taskId, field, value) {
    await supabase.from("tasks").update({ [field]: value }).eq("id", taskId);
    loadTasks(selectedFolder);
  }

  function handleDragStart(e, index, task) {
    dragIndex.current = index;
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(index) { setDragOverIndex(index); }

  async function handleDrop(dropIndex) {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) { dragIndex.current = null; setDragOverIndex(null); return; }
    const reordered = [...activeTasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    await Promise.all(reordered.map((task, idx) =>
      supabase.from("tasks").update({ sort_order: idx }).eq("id", task.id)
    ));
    dragIndex.current = null; setDragOverIndex(null);
    loadTasks(selectedFolder);
  }

  function handleDragEnd() { dragIndex.current = null; setDragOverIndex(null); }

  useEffect(() => { loadFolders(); loadProjects(); }, [user]);
  useEffect(() => {
    if (selectedFolder) { localStorage.setItem("selectedFolder", selectedFolder); loadTasks(selectedFolder); }
  }, [selectedFolder]);

  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  function fmtShort(d) {
    if (!d) return null;
    const date = new Date(d + "T00:00:00");
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  }

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

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>Today's Tasks</h2>

      <div style={{ marginBottom: "20px", width: "180px" }}>
        <SelectPopover value={String(selectedFolder)} onChange={setSelectedFolder} options={folderOptions} placeholder="Select folder" />
      </div>

      {/* New task row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", alignItems: "center" }}>
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
        <div style={{ width: "130px" }}>
          <DatePopover value={scheduledDate} onChange={setScheduledDate} />
        </div>
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

      {activeTasks.map((task, index) => {
        const isEditing = editingId === task.id;
        return (
          <div
            key={task.id} className="task-row" draggable
            onDragStart={(e) => handleDragStart(e, index, task)}
            onDragEnter={() => handleDragEnter(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)} onDragEnd={handleDragEnd}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              opacity: dragIndex.current === index ? 0.4 : 1,
              borderTop: dragOverIndex === index && dragIndex.current !== index ? "2px solid var(--sage)" : "2px solid transparent",
              transition: "border-color 0.1s ease",
            }}
          >
            <div className="drag-handle" title="Drag to reorder">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </div>

            <input type="checkbox" onChange={() => completeTask(task.id)} />

            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>{task.title}</div>
              {task.source_url && (
                <a href={task.source_url} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--sage-deep)", marginTop: "4px", textDecoration: "none" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View in {task.source || "source"}
                </a>
              )}
              {!isEditing && (task.scheduled_date || (task.repeat_type && task.repeat_type !== "none")) && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#8b938d", marginTop: "4px" }}>
                  {task.scheduled_date && <span>{fmtShort(task.scheduled_date)}</span>}
                  {task.repeat_type && task.repeat_type !== "none" && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      {task.repeat_type}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              <div style={{ width: "140px" }}>
                <SelectPopover
                  value={String(task.project_id || "")}
                  onChange={(val) => updateTaskField(task.id, "project_id", val || null)}
                  options={projectOptions} placeholder="No project" size="sm"
                />
              </div>

              {isEditing ? (
                <>
                  <div style={{ width: "120px" }}>
                    <DatePopover
                      value={task.scheduled_date || ""}
                      onChange={(val) => updateTaskField(task.id, "scheduled_date", val || null)}
                      size="sm"
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <RepeatPopover
                      value={task.repeat_type || "none"}
                      onChange={(val) => updateTaskField(task.id, "repeat_type", val)}
                      size="sm"
                    />
                  </div>
                  <button className="delete-icon" title="Done" onClick={() => setEditingId(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <button className="delete-icon" title="Edit schedule & repeat" onClick={() => setEditingId(task.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
              )}

              <button className="delete-icon" title="Delete task" onClick={() => setTaskPendingDelete(task)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

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