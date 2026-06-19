import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "../components/ConfirmDialog";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [folders, setFolders] = useState([]);

  const [projectName, setProjectName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");

  const [projectPendingDelete, setProjectPendingDelete] =
    useState(null);

  async function loadFolders() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  async function createProject() {
    if (!projectName.trim() || !selectedFolder) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    console.log("Deleting project:", projectId);

    const { data: taskData, error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("project_id", projectId)
      .select();

    console.log("Tasks deleted:", taskData);
    console.log("Tasks error:", tasksError);

    if (tasksError) {
      alert(tasksError.message);
      return;
    }

    const { data: projectData, error: projectError } =
      await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select();

    console.log("Project deleted:", projectData);
    console.log("Project error:", projectError);

    if (projectError) {
      alert(projectError.message);
      return;
    }

    setProjects((prev) =>
      prev.filter((project) => project.id !== projectId)
    );

    setProjectPendingDelete(null);

    await loadProjects();
  }

  useEffect(() => {
    loadFolders();
    loadProjects();
  }, []);

  function getFolderName(folderId) {
    const folder = folders.find(
      (f) => String(f.id) === String(folderId)
    );

    return folder?.name || "No Folder";
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

      {projects.map((project) => (
        <div
          key={project.id}
          className="task-row"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {project.name}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#8a8a8a",
                marginTop: "4px",
              }}
            >
              Folder: {getFolderName(project.folder_id)}
            </div>
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
      ))}

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