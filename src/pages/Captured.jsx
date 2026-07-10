import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { SelectPopover, DatePopover, RepeatPopover } from "../components/Popover";

function Captured({ user }) {
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [edits, setEdits] = useState({});

  async function loadFolders() {
    if (!user) return;
    const { data } = await supabase.from("folders").select("*").eq("user_id", user.id).order("name");
    setFolders(data || []);
  }

  async function loadProjects() {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name");
    setProjects(data || []);
  }

  async function loadCapturedTasks() {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks").select("*").eq("user_id", user.id)
      .is("folder_id", null).order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const captured = data || [];
    setTasks(captured);
    setEdits((prev) => {
      const next = { ...prev };
      captured.forEach((task) => {
        if (!next[task.id]) {
          next[task.id] = {
            title: task.title || "",
            notes: task.notes || "",
            folder_id: "",
            project_id: "",
            scheduled_date: task.scheduled_date || "",
            repeat_type: task.repeat_type || "none",
          };
        }
      });
      return next;
    });
  }

  useEffect(() => { loadFolders(); loadProjects(); loadCapturedTasks(); }, [user]);

  function updateEdit(taskId, field, value) {
    setEdits((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
        ...(field === "folder_id" ? { project_id: "" } : {}),
      },
    }));
  }

  async function organizeTask(task) {
    const edit = edits[task.id];
    if (!edit?.folder_id) { alert("Choose a folder before organizing this task."); return; }
    if (!edit.title?.trim()) { alert("This task needs a title before organizing it."); return; }
    const { error } = await supabase.from("tasks").update({
      title: edit.title.trim(), notes: edit.notes || null,
      folder_id: edit.folder_id, project_id: edit.project_id || null,
      scheduled_date: edit.scheduled_date || null, repeat_type: edit.repeat_type || "none",
    }).eq("id", task.id);
    if (error) { alert(error.message); return; }
    loadCapturedTasks();
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { alert(error.message); return; }
    loadCapturedTasks();
  }

  function projectsForFolder(folderId) {
    if (!folderId) return [];
    return projects.filter((p) => String(p.folder_id) === String(folderId));
  }

  const folderOptions = folders.map((f) => ({ value: String(f.id), label: f.name }));

  return (
    <div className="card">
      <h2 style={{ marginBottom: "8px" }}>Captured</h2>
      <p style={{ color: "var(--slate-light)", fontSize: "14px", marginBottom: "20px" }}>
        Anything sent over from Gmail lands here first. Organize each one and it'll move into your normal views.
      </p>

      {tasks.length === 0 && (
        <p style={{ color: "var(--slate-light)" }}>Nothing waiting to be organized right now.</p>
      )}

      {tasks.length > 0 && (
        <div className="captured-list">
          {tasks.map((task) => {
            const edit = edits[task.id] || { title: "", notes: "", folder_id: "", project_id: "", scheduled_date: "", repeat_type: "none" };
            const projectOptions = [
              { value: "", label: "No project" },
              ...projectsForFolder(edit.folder_id).map((p) => ({ value: String(p.id), label: p.name })),
            ];

            return (
              <div key={task.id} className="captured-row">
                {/* Header: editable title + delete */}
                <div className="captured-header">
                  <input
                    className="captured-title-input"
                    value={edit.title}
                    onChange={(e) => updateEdit(task.id, "title", e.target.value)}
                    placeholder="Task title"
                  />
                  <button className="delete-icon" title="Delete" onClick={() => deleteTask(task.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                    </svg>
                  </button>
                </div>

                {task.source && (
                  <div className="captured-source">
                    via {task.source}
                    {task.source_url && (
                      <> · <a href={task.source_url} target="_blank" rel="noreferrer">View original</a></>
                    )}
                  </div>
                )}

                <textarea
                  className="captured-notes-input"
                  value={edit.notes}
                  onChange={(e) => updateEdit(task.id, "notes", e.target.value)}
                  placeholder="Notes / description"
                  rows={3}
                />

                {/* Organize controls — all using Popovers */}
                <div className="captured-fields">
                  <div style={{ width: "160px" }}>
                    <SelectPopover
                      value={edit.folder_id}
                      onChange={(val) => updateEdit(task.id, "folder_id", val)}
                      options={folderOptions}
                      placeholder="Choose folder..."
                      size="sm"
                    />
                  </div>
                  <div style={{ width: "150px" }}>
                    <SelectPopover
                      value={edit.project_id}
                      onChange={(val) => updateEdit(task.id, "project_id", val)}
                      options={projectOptions}
                      placeholder="No project"
                      size="sm"
                    />
                  </div>
                  <div style={{ width: "130px" }}>
                    <DatePopover
                      value={edit.scheduled_date}
                      onChange={(val) => updateEdit(task.id, "scheduled_date", val)}
                      placeholder="Schedule"
                      size="sm"
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <RepeatPopover
                      value={edit.repeat_type}
                      onChange={(val) => updateEdit(task.id, "repeat_type", val)}
                      size="sm"
                    />
                  </div>
                  <button onClick={() => organizeTask(task)}>Organize</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Captured;