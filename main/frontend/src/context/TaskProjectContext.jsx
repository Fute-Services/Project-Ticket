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
import { useCursorPagination } from '../hooks/useCursorPagination';

const TaskProjectContext = createContext(null);

// Coordinator/Founder see the team-wide task/project board - a shared view
// multiple people act on, so it's worth polling for changes made by others.
// Employee only ever sees their own assigned tasks, which already update
// instantly via optimistic local state on their own actions - no background
// poll needed there, manual refresh only.
const SHARED_BOARD_ROLES = ['coordinator', 'founder'];
const SHARED_POLL_MS = 180000;

// Shared across the Coordinator's Tasks/Projects pages, the Founder's
// Project Details view, and the Employee dashboard's "My Tasks" view - a
// task the coordinator assigns shows up immediately on the assigned
// employee's own list, since all three now read the same backend
// collections instead of separate local copies.
export function TaskProjectProvider({ children }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { hasMore, loadingMore, setCursor, loadMore } = useCursorPagination();
  const isSharedBoard = Boolean(user) && SHARED_BOARD_ROLES.includes(user.role);

  const refresh = useCallback(async () => {
    if (!user || !['employee', 'coordinator', 'founder'].includes(user.role)) {
      setTasks([]);
      setProjects([]);
      setCursor(null);
      return;
    }
    setLoading(true);
    try {
      const [taskRes, projectRes] = await Promise.all([getTasks(), getProjects()]);
      // Defensive: a response caught mid-deploy (stale serverless instance,
      // proxy hiccup) can come back without the expected shape - fall back
      // to empty rather than let `undefined` propagate into .filter/.map
      // and crash the whole dashboard.
      setTasks(taskRes.data?.items || []);
      setCursor(taskRes.data?.nextCursor || null);
      setProjects(projectRes.data || []);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load tasks/projects:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on
    // id/role (stable primitives), not the `user` object itself, which
    // AuthContext replaces with a new reference on every login-state
    // refresh even when the actual user hasn't changed - depending on the
    // object caused this refresh to needlessly refire and duplicate reads.
  }, [user?.id, user?.role, setCursor]);

  // Appends the next 20 tasks - resets back to page 1 on the next poll/refresh.
  function loadMoreTasks() {
    return loadMore(getTasks, (items) => setTasks((prev) => [...prev, ...items]));
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, SHARED_POLL_MS, isSharedBoard);

  async function addTask(task) {
    try {
      const { data } = await createTaskApi(task);
      setTasks((prev) => [data, ...prev]);
    } catch (e) {
      console.error('Failed to create task:', e.response?.data?.error || e.message);
      throw e;
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

  /** Patch any subset of a task's fields - used by the task detail pane. */
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
   * Asana-style completion toggle. There's no separate `completed` flag -
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
      value={{ tasks, projects, loading, addTask, moveTask, updateTask, toggleComplete, refresh, hasMoreTasks: hasMore, loadMoreTasks, loadingMore, lastUpdated, isSharedBoard }}
    >
      {children}
    </TaskProjectContext.Provider>
  );
}

export function useTaskProject() {
  return useContext(TaskProjectContext);
}
