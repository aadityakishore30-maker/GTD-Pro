import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Archive({ user }) {
  const [tasks, setTasks] = useState([]);

  async function loadCompletedTasks() {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or("status.eq.Completed,last_completed_date.not.is.null");

    if (error) {
      console.error(error);
      return;
    }

    // Repeating tasks use last_completed_date, one-time tasks use
    // completed_at. Sort everything together by whichever applies.
    const sorted = (data || []).slice().sort((a, b) => {
      const aTime = a.last_completed_date
        ? new Date(a.last_completed_date).getTime()
        : a.completed_at
        ? new Date(a.completed_at).getTime()
        : 0;
      const bTime = b.last_completed_date
        ? new Date(b.last_completed_date).getTime()
        : b.completed_at
        ? new Date(b.completed_at).getTime()
        : 0;
      return bTime - aTime;
    });

    setTasks(sorted);
  }

  async function restoreTask(task) {
    const isRepeating =
      task.repeat_type && task.repeat_type !== "none";

    // Repeating tasks: just clear today's "done" mark so it
    // shows back up in Today's list right away.
    // One-time tasks: fully un-complete them, same as before.
    const updates = isRepeating
      ? { last_completed_date: null }
      : { status: "Inbox", completed_at: null };

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadCompletedTasks();
  }

  useEffect(() => {
    loadCompletedTasks();
  }, [user]);

  return (
    <div className="card">
      <h2>Archive</h2>

      {tasks.length === 0 && (
        <p>No completed tasks yet.</p>
      )}

      {tasks.length > 0 && (
        <div className="archive-list">
          {tasks.map((task) => {
            const isRepeating =
              task.repeat_type && task.repeat_type !== "none";

            return (
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
                    {isRepeating
                      ? task.last_completed_date
                        ? new Date(
                            task.last_completed_date
                          ).toLocaleDateString()
                        : "-"
                      : task.completed_at
                      ? new Date(
                          task.completed_at
                        ).toLocaleString()
                      : "-"}
                  </div>

                  {isRepeating && (
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
                      {task.repeat_type} — returns automatically
                    </div>
                  )}
                </div>

                <button
                  className="btn-ghost"
                  onClick={() => restoreTask(task)}
                >
                  Restore
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Archive;