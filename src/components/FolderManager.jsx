import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";

function FolderManager({ user }) {
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState("");

  const [selectedFolder, setSelectedFolder] = useState(
    localStorage.getItem("selectedFolder") || ""
  );

  const [folderPendingDelete, setFolderPendingDelete] = useState(null);

  // Tracks which folder is currently being hovered while dragging
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  async function loadFolders() {
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
    if (!user) return;

    const { error } = await supabase
      .from("folders")
      .insert([
        {
          name: folderName.trim(),
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

  // ------------------------------------------------------------
  // DRAG & DROP
  // Move one or multiple tasks into this folder
  // ------------------------------------------------------------

  function handleFolderDragOver(e, folderId) {
    e.preventDefault();

    // Tell the browser this is a valid move/drop target
    e.dataTransfer.dropEffect = "move";

    setDragOverFolderId(folderId);
  }

  function handleFolderDragLeave(e, folderId) {
    // Only clear the highlight when actually leaving the folder.
    // This prevents flickering when moving over children inside it.
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverFolderId(null);
    }
  }

  async function handleFolderDrop(e, folderId) {
    e.preventDefault();
    e.stopPropagation();

    setDragOverFolderId(null);

    if (!user) return;

    let taskIds = [];

    // Multi-select drag
    const multipleTaskIds = e.dataTransfer.getData("taskIds");

    if (multipleTaskIds) {
      try {
        const parsedIds = JSON.parse(multipleTaskIds);

        if (Array.isArray(parsedIds)) {
          taskIds = parsedIds;
        }
      } catch (error) {
        console.error("Could not read dragged task IDs:", error);
      }
    }

    // Single-task drag
    if (taskIds.length === 0) {
      const singleTaskId = e.dataTransfer.getData("taskId");

      if (singleTaskId) {
        taskIds = [singleTaskId];
      }
    }

    if (taskIds.length === 0) {
      console.warn("No task ID found in dragged data.");
      return;
    }

    // Remove duplicates and ignore empty values
    taskIds = [
      ...new Set(
        taskIds
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    console.log(
      "Moving tasks:",
      taskIds,
      "to folder:",
      folderId
    );

    // Update the folder_id for all dragged tasks.
    // user_id is included so a user can only move their own tasks.
    const { error } = await supabase
      .from("tasks")
      .update({
        folder_id: folderId,
      })
      .in("id", taskIds)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to move tasks:", error);
      alert(`Could not move task(s): ${error.message}`);
      return;
    }

    // Make the destination folder the active folder so the user
    // can immediately see the moved task(s).
    localStorage.setItem(
      "selectedFolder",
      String(folderId)
    );

    setSelectedFolder(String(folderId));

    // Reload so TaskManager fetches the correct folder's tasks
    // from Supabase and clears the existing drag/selection state.
    window.location.reload();
  }

  useEffect(() => {
    loadFolders();
  }, [user]);

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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              createFolder();
            }
          }}
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
        {folders.map((folder) => {
          const isSelected =
            String(selectedFolder) === String(folder.id);

          const isDragOver =
            String(dragOverFolderId) === String(folder.id);

          return (
            <div
              key={folder.id}
              className={
                "folder-item" +
                (isSelected ? " selected" : "")
              }
              onClick={() => {
                localStorage.setItem(
                  "selectedFolder",
                  folder.id
                );

                window.location.reload();
              }}
              onDragOver={(e) =>
                handleFolderDragOver(e, folder.id)
              }
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverFolderId(folder.id);
              }}
              onDragLeave={(e) =>
                handleFolderDragLeave(e, folder.id)
              }
              onDrop={(e) =>
                handleFolderDrop(e, folder.id)
              }
              style={{
                position: "relative",

                // Preserve the existing folder appearance
                // while adding a clear drop state.
                outline: isDragOver
                  ? "2px dashed var(--sage)"
                  : "2px solid transparent",

                background: isDragOver
                  ? "var(--sage-pale)"
                  : undefined,

                transform: isDragOver
                  ? "scale(1.01)"
                  : "scale(1)",

                transition:
                  "background 0.12s, outline 0.12s, transform 0.12s",

                cursor: "pointer",
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
                  setDragOverFolderId(null);
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
          );
        })}
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