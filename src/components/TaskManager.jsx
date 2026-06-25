import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";

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

  const [taskPendingDelete, setTaskPendingDelete] =
    useState(null);

  async function loadFolders() {
    if (!user) return;

    const { data } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    setFolders(data || []);

    const savedFolder =
      localStorage.getItem("selectedFolder");

    if (
      savedFolder &&
      data?.some(
        (folder) =>
          String(folder.id) === String(savedFolder)
      )
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
    if (!folderId) return;
    if (!user) return;

    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        projects (
          id,
          name
        )
      `)
      .eq("folder_id", folderId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTasks(data || []);
  }

  async function createTask() {
    if (!taskName.trim()) return;
    if (!user) return;

    const { error } = await supabase
      .from("tasks")
      .insert([
        {
          title: taskName,
          folder_id: selectedFolder,
          user_id: user.id,
          project_id: selectedProject || null,
          scheduled_date: scheduledDate || null,
          original_scheduled_date: scheduledDate || null,
          repeat_type: repeatType,
          status: "Inbox",
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setTaskName("");
    setSelectedProject("");
    setScheduledDate("");
    setRepeatType("none");

    await loadTasks(selectedFolder);
  }

  async function completeTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isRepeating =
      task.repeat_type && task.repeat_type !== "none";

    if (isRepeating) {
      // Repeating task: mark today's occurrence as done.
      // Status stays untouched so the task comes back on its
      // next scheduled day instead of being archived forever.
      // completed_at is also stamped here purely so Archive can
      // sort/paginate every completed task on one shared column.
      await supabase
        .from("tasks")
        .update({
          last_completed_date: today,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    } else {
      await supabase
        .from("tasks")
        .update({
          status: "Completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    }

    loadTasks(selectedFolder);
  }

  async function deleteTask(taskId) {
  console.log("Deleting task:", taskId);

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select();

  console.log("Delete result:", data);
  console.log("Delete error:", error);

  if (error) {
    alert(error.message);
    return;
  }

  setTaskPendingDelete(null);
  loadTasks(selectedFolder);
}

  useEffect(() => {
    loadFolders();
    loadProjects();
  }, [user]);

  useEffect(() => {
    if (selectedFolder) {
      localStorage.setItem(
        "selectedFolder",
        selectedFolder
      );

      loadTasks(selectedFolder);
    }
  }, [selectedFolder]);

  const now = new Date();

  const today =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  console.log("TODAY =", today);
  console.log("TASKS =", tasks);

  const activeTasks = tasks.filter((task) => {
    const isRepeating =
      task.repeat_type && task.repeat_type !== "none";

    if (isRepeating) {
      // Only hide a repeating task if today's occurrence is
      // already marked done; it returns automatically on its
      // next scheduled day.
      if (task.last_completed_date === today) {
        return false;
      }
    } else if (
      task.status?.toLowerCase() === "completed"
    ) {
      return false;
    }

    if (!task.scheduled_date) {
      return true;
    }

    if (task.repeat_type === "daily") {
      return true;
    }

    if (task.repeat_type === "weekly") {
      const todayDay = new Date().getDay();
      const taskDay = new Date(
        task.scheduled_date
      ).getDay();

      return todayDay === taskDay;
    }

    if (task.repeat_type === "monthly") {
      const todayDate = new Date().getDate();
      const taskDate = new Date(
        task.scheduled_date
      ).getDate();

      return todayDate === taskDate;
    }

    return task.scheduled_date === today;
  });

  return (
    <div className="card">
      <h2 style={{ marginBottom: "20px" }}>
        Today's Tasks
      </h2>

      <select
        value={selectedFolder}
        onChange={(e) =>
          setSelectedFolder(e.target.value)
        }
        style={{ marginBottom: "20px" }}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "2fr 170px 150px 140px auto",
          gap: "10px",
          marginBottom: "24px",
          alignItems: "center",
        }}
      >
        <input
          value={taskName}
          onChange={(e) =>
            setTaskName(e.target.value)
          }
          placeholder="New task..."
        />

        <select
          value={selectedProject}
          onChange={(e) =>
            setSelectedProject(e.target.value)
          }
        >
          <option value="">Project</option>

          {projects
            .filter(
              (project) =>
                String(project.folder_id) ===
                String(selectedFolder)
            )
            .map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
        </select>

        <input
          type="date"
          value={scheduledDate}
          onChange={(e) =>
            setScheduledDate(e.target.value)
          }
        />

        <select
          value={repeatType}
          onChange={(e) =>
            setRepeatType(e.target.value)
          }
        >
          <option value="none">
            No Repeat
          </option>
          <option value="daily">
            Daily
          </option>
          <option value="weekly">
            Weekly
          </option>
          <option value="monthly">
            Monthly
          </option>
        </select>

        <button onClick={createTask}>
          Add
        </button>
      </div>

      {activeTasks.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#8b938d",
          }}
        >
          No tasks scheduled for today
        </div>
      )}

      {activeTasks.map((task) => (
        <div
          key={task.id}
          className="task-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <input
            type="checkbox"
            onChange={() => completeTask(task.id)}
          />

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
              {task.title}
            </div>

            {task.source_url && (
              <a
                href={task.source_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "var(--sage-deep)",
                  marginTop: "4px",
                  textDecoration: "none",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View in {task.source || "source"}
              </a>
            )}

            {task.projects?.name && (
              <div className="project-pill">
                {task.projects.name}
              </div>
            )}

            {task.repeat_type &&
              task.repeat_type !== "none" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#8b938d",
                    marginTop: "4px",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 2l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 22l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {task.repeat_type}
                </div>
              )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "auto",
            }}
          >
            <input
              type="date"
              value={task.scheduled_date || ""}
              onChange={async (e) => {
                const update = {
                  scheduled_date: e.target.value,
                };

                if (!task.original_scheduled_date) {
                  update.original_scheduled_date =
                    e.target.value;
                }

                await supabase
                  .from("tasks")
                  .update(update)
                  .eq("id", task.id);

                loadTasks(selectedFolder);
              }}
              style={{
                width: "140px",
                height: "32px",
                fontSize: "12px",
              }}
            />

            <select
              value={task.repeat_type || "none"}
              onChange={async (e) => {
                await supabase
                  .from("tasks")
                  .update({
                    repeat_type: e.target.value,
                  })
                  .eq("id", task.id);

                loadTasks(selectedFolder);
              }}
              style={{
                width: "90px",
                height: "32px",
                fontSize: "12px",
              }}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button
  className="delete-icon"
  title="Delete task"
  onClick={() => setTaskPendingDelete(task)}
  style={{
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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