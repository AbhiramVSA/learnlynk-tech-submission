import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Task {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
}

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    const { start, end } = getTodayRange();

    const { data, error: err } = await supabase
      .from("tasks")
      .select("id, type, status, application_id, due_at")
      .gte("due_at", start)
      .lt("due_at", end)
      .neq("status", "completed")
      .order("due_at", { ascending: true });

    if (err) {
      console.error(err);
      setError("Failed to load tasks");
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  };

  const completeTask = async (taskId: string) => {
    const { error: err } = await supabase
      .from("tasks")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (err) {
      console.error(err);
      alert("Failed to mark task complete");
      return;
    }

    // remove from list
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Today&apos;s Tasks</h1>
      
      {tasks.length === 0 ? (
        <p>No tasks due today 🎉</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Application</th>
              <th>Due At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.type}</td>
                <td>{task.application_id}</td>
                <td>{new Date(task.due_at).toLocaleString()}</td>
                <td>{task.status}</td>
                <td>
                  <button onClick={() => completeTask(task.id)}>
                    Mark Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
