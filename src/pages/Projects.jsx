import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "../components/ConfirmDialog";

function Projects({ user }) {
  const [projects, setProjects] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [projectName, setProjectName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");

  const [projectPendingDelete, setProjectPendingDelete] =
    useState(null);

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

    if (data?.length > 0 && !selectedFolder) {
      setSelectedFolder(data[0].id);
    }
  }

  async function loadProjects() {
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setProjects(data || []);
  }

  // Pulled once so every project card can compute its own
  // "X of Y tasks done" without a separate query per card.
  async function loadTaskCounts() {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("id, project_id, status, repeat_type, last_completed_date")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      return;
    }

    setTasks(data || []);
  }

  async function createProject() {
    if (!projectName.trim() || !selectedFolder) return;
    if (!user) return;

    const { error } = await supabase
      .from("projects")
      .insert([
        {
          name: projectName,
          user_id: user.id,
          folder_id: selectedFolder,
          status: "Active",
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setProjectName("");

    await loadProjects();
  }

  async function deleteProject(projectId) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("project_id", projectId);

    if (tasksError) {
      alert(tasksError.message);
      return;
    }

    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (projectError) {
      alert(projectError.message);
      return;
    }

    setProjects((prev) =>
      prev.filter((project) => project.id !== projectId)
    );

    setProjectPendingDelete(null);

    await loadProjects();
    await loadTaskCounts();
  }

  useEffect(() => {
    loadFolders();
    loadProjects();
    loadTaskCounts();
  }, [user]);

  function getFolderName(folderId) {
    const folder = folders.find(
      (f) => String(f.id) === String(folderId)
    );

    return folder?.name || "No Folder";
  }

  const now = new Date();
  const today =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  function isTaskDone(task) {
    const isRepeating =
      task.repeat_type && task.repeat_type !== "none";

    if (isRepeating) {
      return task.last_completed_date === today;
    }

    return task.status?.toLowerCase() === "completed";
  }

  function getProjectStats(projectId) {
    const projectTasks = tasks.filter(
      (task) => String(task.project_id) === String(projectId)
    );

    const total = projectTasks.length;
    const completed = projectTasks.filter(isTaskDone).length;
    const percent =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, percent };
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>
        Projects
      </h2>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project name"
          style={{ flex: 1 }}
        />

        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          style={{
            width: "180px",
            flex: "none",
          }}
        >
          {folders.map((folder) => (
            <option
              key={folder.id}
              value={folder.id}
            >
              {folder.name}
            </option>
          ))}
        </select>

        <button
          onClick={createProject}
          style={{
            width: "120px",
            flex: "none",
          }}
        >
          Create
        </button>
      </div>

      {projects.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#8b938d",
          }}
        >
          No projects yet
        </div>
      )}

      {projects.length > 0 && (
        <div className="project-grid">
          {projects.map((project) => {
            const { total, completed, percent } =
              getProjectStats(project.id);

            return (
              <div
                key={project.id}
                className="project-card"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <div className="project-name">
                    {project.name}
                  </div>

                  <button
                    className="delete-icon"
                    title="Delete project"
                    onClick={() =>
                      setProjectPendingDelete(project)
                    }
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

                <div className="project-folder">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                  </svg>
                  Folder: {getFolderName(project.folder_id)}
                </div>

                <div className="project-progress-bar">
                  <div
                    className="project-progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="project-stats">
                  {completed} of {total} tasks done · {percent}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={projectPendingDelete !== null}
        title="Delete this project?"
        message="This will permanently delete the project along with every task assigned to it. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() =>
          deleteProject(projectPendingDelete.id)
        }
        onCancel={() =>
          setProjectPendingDelete(null)
        }
      />
    </div>
  );
}

export default Projects;