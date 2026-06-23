import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const PAGE_SIZE = 10;

function Archive({ user }) {
  const [tasks, setTasks] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // reset = true: fresh load (first 10, replaces the list)
  // reset = false: "See more" load (next 10, appended to the list)
  async function loadCompletedTasks(reset) {
    if (!user) return;

    const from = reset ? 0 : tasks.length;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or("status.eq.Completed,last_completed_date.not.is.null")
      .order("completed_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      return;
    }

    const page = data || [];

    setTasks((prev) => (reset ? page : [...prev, ...page]));
    setHasMore(page.length === PAGE_SIZE);
  }

  async function handleSeeMore() {
    setLoadingMore(true);
    await loadCompletedTasks(false);
    setLoadingMore(false);
  }

  async function restoreTask(task) {
    const isRepeating =
      task.repeat_type && task.repeat_type !== "none";

    // Repeating tasks: just clear today's "done" mark so it
    // shows back up in Today's list right away.
    // One-time tasks: fully un-complete them, same as before.
    const updates = isRepeating
      ? { last_completed_date: null, completed_at: null }
      : { status: "Inbox", completed_at: null };

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    // Restoring changes the underlying set, so refresh back to
    // page one rather than trying to patch the loaded pages.
    loadCompletedTasks(true);
  }

  useEffect(() => {
    loadCompletedTasks(true);
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

      {hasMore && tasks.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <button
            onClick={handleSeeMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "See more"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Archive;