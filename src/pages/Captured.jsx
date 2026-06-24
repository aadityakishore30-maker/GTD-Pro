import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Captured({ user }) {
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [edits, setEdits] = useState({});

  async function loadFolders() {
    if (!user) return;

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setFolders(data || []);
  }

  async function loadProjects() {
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setProjects(data || []);
  }

  // A task with no folder assigned yet is, by definition, still
  // sitting in the capture inbox - this is the one thing that
  // both creates and clears an entry on this page.
  async function loadCapturedTasks() {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .is("folder_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const captured = data || [];
    setTasks(captured);

    // Seed editable fields for any newly-seen task, without
    // clobbering edits already in progress for existing ones.
    setEdits((prev) => {
      const next = { ...prev };

      captured.forEach((task) => {
        if (!next[task.id]) {
          next[task.id] = {
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

  useEffect(() => {
    loadFolders();
    loadProjects();
    loadCapturedTasks();
  }, [user]);

  function updateEdit(taskId, field, value) {
    setEdits((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
        // Changing folder clears any previously chosen project,
        // since that project may not belong to the new folder.
        ...(field === "folder_id" ? { project_id: "" } : {}),
      },
    }));
  }

  async function organizeTask(task) {
    const edit = edits[task.id];

    if (!edit?.folder_id) {
      alert("Choose a folder before organizing this task.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        folder_id: edit.folder_id,
        project_id: edit.project_id || null,
        scheduled_date: edit.scheduled_date || null,
        repeat_type: edit.repeat_type || "none",
      })
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadCapturedTasks();
  }

  async function deleteTask(taskId) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    loadCapturedTasks();
  }

  function projectsForFolder(folderId) {
    if (!folderId) return [];

    return projects.filter(
      (project) => String(project.folder_id) === String(folderId)
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: "8px" }}>Captured</h2>

      <p
        style={{
          color: "var(--slate-light)",
          fontSize: "14px",
          marginBottom: "20px",
        }}
      >
        Anything sent over from Gmail or Chat lands here first.
        Organize each one below and it'll move into your normal
        Today / Upcoming / Project views.
      </p>

      {tasks.length === 0 && (
        <p style={{ color: "var(--slate-light)" }}>
          Nothing waiting to be organized right now.
        </p>
      )}

      {tasks.length > 0 && (
        <div className="captured-list">
          {tasks.map((task) => {
            const edit = edits[task.id] || {
              folder_id: "",
              project_id: "",
              scheduled_date: "",
              repeat_type: "none",
            };

            return (
              <div key={task.id} className="captured-row">
                <div className="captured-header">
                  <div className="captured-title">
                    {task.title}
                  </div>

                  <button
                    className="delete-icon"
                    title="Delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>

                {task.source && (
                  <div className="captured-source">
                    via {task.source}
                    {task.source_url && (
                      <>
                        {" "}·{" "}
                        <a
                          href={task.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View original
                        </a>
                      </>
                    )}
                  </div>
                )}

                {task.notes && (
                  <div className="captured-notes">
                    {task.notes}
                  </div>
                )}

                <div className="captured-fields">
                  <select
                    value={edit.folder_id}
                    onChange={(e) =>
                      updateEdit(
                        task.id,
                        "folder_id",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Choose folder...</option>
                    {folders.map((folder) => (
                      <option
                        key={folder.id}
                        value={folder.id}
                      >
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={edit.project_id}
                    onChange={(e) =>
                      updateEdit(
                        task.id,
                        "project_id",
                        e.target.value
                      )
                    }
                  >
                    <option value="">No project</option>
                    {projectsForFolder(edit.folder_id).map(
                      (project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.name}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    type="date"
                    value={edit.scheduled_date}
                    onChange={(e) =>
                      updateEdit(
                        task.id,
                        "scheduled_date",
                        e.target.value
                      )
                    }
                  />

                  <select
                    value={edit.repeat_type}
                    onChange={(e) =>
                      updateEdit(
                        task.id,
                        "repeat_type",
                        e.target.value
                      )
                    }
                  >
                    <option value="none">No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  <button onClick={() => organizeTask(task)}>
                    Organize
                  </button>
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