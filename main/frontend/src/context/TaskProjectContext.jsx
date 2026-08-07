import { createContext, useContext, useState } from 'react';
import { tasks as SEED_TASKS, projects as SEED_PROJECTS } from '../data/coordinatorMockData';

const TaskProjectContext = createContext(null);

// Shared across the Coordinator's Tasks/Projects pages, the Founder's
// Project Details view, and the Employee dashboard's "My Tasks" view — a
// task the coordinator assigns shows up immediately on the assigned
// employee's own list, since all three read/write the same state instead
// of separate local copies (mirrors TicketContext's pattern).
export function TaskProjectProvider({ children }) {
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [projects] = useState(SEED_PROJECTS);

  function addTask(task) {
    setTasks((prev) => [
      {
        id: `TK-${900 + prev.length + 1}`,
        status: 'Pending',
        comments: 0,
        attachments: 0,
        figma: '',
        pr: '',
        ...task,
      },
      ...prev,
    ]);
  }

  function moveTask(id, status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  /** Patch any subset of a task's fields — used by the task detail pane. */
  function updateTask(id, patch) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  /**
   * Asana-style completion toggle. There's no separate `completed` flag —
   * "Completed" is one of TASK_STATUSES, so toggling off has to pick
   * something to return to, and Pending is the safe choice.
   */
  function toggleComplete(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t))
    );
  }

  return (
    <TaskProjectContext.Provider
      value={{ tasks, projects, addTask, moveTask, updateTask, toggleComplete }}
    >
      {children}
    </TaskProjectContext.Provider>
  );
}

export function useTaskProject() {
  return useContext(TaskProjectContext);
}
