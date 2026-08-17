import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getProjects,
  getTasks,
  createTask as createTaskApi,
  updateTaskStatus as updateTaskStatusApi,
  updateTask as updateTaskApi,
} from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const TaskProjectContext = createContext(null);

const POLL_MS = 20000;

// Shared across the Coordinator's Tasks/Projects pages, the Founder's
// Project Details view, and the Employee dashboard's "My Tasks" view — a
// task the coordinator assigns shows up immediately on the assigned
// employee's own list, since all three now read the same backend
// collections instead of separate local copies.
export function TaskProjectProvider({ children }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !['employee', 'coordinator', 'founder'].includes(user.role)) {
      setTasks([]);
      setProjects([]);
      return;
    }
    setLoading(true);
    try {
      const [taskRes, projectRes] = await Promise.all([getTasks(), getProjects()]);
      setTasks(taskRes.data);
      setProjects(projectRes.data);
    } catch (e) {
      console.error('Failed to load tasks/projects:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, Boolean(user));

  async function addTask(task) {
    try {
      const { data } = await createTaskApi(task);
      setTasks((prev) => [data, ...prev]);
    } catch (e) {
      console.error('Failed to create task:', e.response?.data?.error || e.message);
    }
  }

  async function moveTask(id, status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const { data } = await updateTaskStatusApi(id, status);
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    } catch (e) {
      console.error('Failed to move task:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  /** Patch any subset of a task's fields — used by the task detail pane. */
  async function updateTask(id, patch) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const { data } = await updateTaskApi(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    } catch (e) {
      console.error('Failed to update task:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  /**
   * Asana-style completion toggle. There's no separate `completed` flag —
   * "Completed" is one of TASK_STATUSES, so toggling off has to pick
   * something to return to, and Pending is the safe choice.
   */
  function toggleComplete(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    moveTask(id, task.status === 'Completed' ? 'Pending' : 'Completed');
  }

  return (
    <TaskProjectContext.Provider
      value={{ tasks, projects, loading, addTask, moveTask, updateTask, toggleComplete, refresh }}
    >
      {children}
    </TaskProjectContext.Provider>
  );
}

export function useTaskProject() {
  return useContext(TaskProjectContext);
}
