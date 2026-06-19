import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "../components/ConfirmDialog";

function FolderManager() {
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState("");

  const [selectedFolder, setSelectedFolder] =
    useState(
      localStorage.getItem("selectedFolder") || ""
    );

  const [folderPendingDelete, setFolderPendingDelete] =
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setFolders(data || []);
  }

  async function createFolder() {
    if (!folderName.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("folders")
      .insert([
        {
          name: folderName,
          user_id: user.id,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setFolderName("");
    await loadFolders();
  }

  async function deleteFolder(folderId) {
    console.log("Deleting folder:", folderId);

    const { data: taskData, error: tasksError } =
      await supabase
        .from("tasks")
        .delete()
        .eq("folder_id", folderId)
        .select();

    console.log("Tasks deleted:", taskData);
    console.log("Tasks error:", tasksError);

    if (tasksError) {
      alert(tasksError.message);
      return;
    }

    const {
      data: projectData,
      error: projectsError,
    } = await supabase
      .from("projects")
      .delete()
      .eq("folder_id", folderId)
      .select();

    console.log("Projects deleted:", projectData);
    console.log("Projects error:", projectsError);

    if (projectsError) {
      alert(projectsError.message);
      return;
    }

    const {
      data: folderData,
      error: folderError,
    } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId)
      .select();

    console.log("Folder deleted:", folderData);
    console.log("Folder error:", folderError);

    if (folderError) {
      alert(folderError.message);
      return;
    }

    if (String(selectedFolder) === String(folderId)) {
      localStorage.removeItem("selectedFolder");
      setSelectedFolder("");
    }

    setFolders((prev) =>
      prev.filter(
        (folder) => String(folder.id) !== String(folderId)
      )
    );

    setFolderPendingDelete(null);

    await loadFolders();
  }

  useEffect(() => {
    loadFolders();
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>
        Folders
      </h2>

      <div
        style={{
          background: "#f8faf8",
          padding: "16px",
          borderRadius: "16px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <input
          value={folderName}
          onChange={(e) =>
            setFolderName(e.target.value)
          }
          placeholder="Create new folder..."
        />

        <button onClick={createFolder}>
          Add Folder
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={
              "folder-item" +
              (String(selectedFolder) ===
              String(folder.id)
                ? " selected"
                : "")
            }
            onClick={() => {
              localStorage.setItem(
                "selectedFolder",
                folder.id
              );

              window.location.reload();
            }}
          >
            <span style={{ flex: 1 }}>
              {folder.name}
            </span>

            <button
              className="delete-icon"
              title="Delete folder"
              onClick={(e) => {
                e.stopPropagation();
                setFolderPendingDelete(folder);
              }}
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
      </div>

      <ConfirmDialog
        open={folderPendingDelete !== null}
        title="Delete this folder?"
        message="This will permanently delete the folder along with every task and project inside it. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() =>
          deleteFolder(folderPendingDelete.id)
        }
        onCancel={() =>
          setFolderPendingDelete(null)
        }
      />
    </div>
  );
}

export default FolderManager;