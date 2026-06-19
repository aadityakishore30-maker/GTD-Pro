import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Archive() {
  const [tasks, setTasks] = useState([]);

  async function loadCompletedTasks() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "Completed")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setTasks(data || []);
  }

  async function restoreTask(taskId) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "Inbox",
        completed_at: null,
      })
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    loadCompletedTasks();
  }

  useEffect(() => {
    loadCompletedTasks();
  }, []);

  return (
    <div className="card">
      <h2>Archive</h2>

      {tasks.length === 0 && (
        <p>No completed tasks yet.</p>
      )}

      {tasks.length > 0 && (
        <div className="archive-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="archive-row"
            >
              <div>
                <div className="archive-title">
                  {task.title}
                </div>

                <div className="archive-meta">
                  Completed:
                  {" "}
                  {task.completed_at
                    ? new Date(task.completed_at).toLocaleString()
                    : "-"}
                </div>
              </div>

              <button
                className="btn-ghost"
                onClick={() => restoreTask(task.id)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Archive;