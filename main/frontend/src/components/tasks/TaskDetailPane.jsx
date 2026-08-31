import { Check, Figma, Github, MessageSquare, Paperclip } from 'lucide-react';
import { Drawer, Field, inputClass } from '../ui';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../data/coordinatorMockData';
import { employees } from '../../data/hrMockData';

function toHref(link) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

/**
 * Task detail as a right-side pane - Asana's model, where opening a task
 * never takes you off the list you were scanning.
 *
 * `readOnly` renders the same layout without inputs, which is what the
 * Employee dashboard needs: people should see the full task without being
 * able to reassign it to someone else.
 */
export default function TaskDetailPane({ task, project, open, onClose, onChange, onToggle, readOnly = false }) {
  if (!task) return null;
  const done = task.status === 'Completed';

  const set = (patch) => onChange?.(task.id, patch);

  return (
    <Drawer open={open} onClose={onClose} title={project ? project.name : 'Task'} wide>
      <div className="flex flex-col gap-5">
        {/* Completion + title */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onToggle?.(task.id)}
            aria-pressed={done}
            aria-label={done ? 'Mark incomplete' : 'Mark complete'}
            className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              done
                ? 'bg-success border-success text-success-foreground'
                : 'border-muted-foreground/40 text-transparent hover:border-success'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Check size={12} strokeWidth={3} />
          </button>

          {readOnly ? (
            <h2 className={`text-base font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </h2>
          ) : (
            <input
              value={task.title}
              onChange={(e) => set({ title: e.target.value })}
              aria-label="Task title"
              className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-ring text-base font-medium text-foreground px-0 py-0.5 focus:outline-none transition-colors"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assignee">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.assignee || '-'}</p>
            ) : (
              <select value={task.assignee} onChange={(e) => set({ assignee: e.target.value })} className={inputClass}>
                {employees.map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Due date">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.dueDate || '-'}</p>
            ) : (
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => set({ dueDate: e.target.value })}
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Status">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.status}</p>
            ) : (
              <select value={task.status} onChange={(e) => set({ status: e.target.value })} className={inputClass}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Priority">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.priority}</p>
            ) : (
              <select value={task.priority} onChange={(e) => set({ priority: e.target.value })} className={inputClass}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Duration">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.duration || '-'}</p>
            ) : (
              <input
                value={task.duration || ''}
                onChange={(e) => set({ duration: e.target.value })}
                placeholder="e.g. 3 days"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Project">
            <p className="text-sm text-foreground">{project?.name || '-'}</p>
          </Field>
        </div>

        {(task.figma || task.pr) && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Linked work</p>
            <div className="flex flex-wrap gap-2">
              {task.figma && (
                <a
                  href={toHref(task.figma)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Figma size={12} /> Design
                </a>
              )}
              {task.pr && (
                <a
                  href={toHref(task.pr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Github size={12} />
                  {task.pr.match(/\/pull\/(\d+)/) ? `PR #${task.pr.match(/\/pull\/(\d+)/)[1]}` : 'Repo'}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
          <span className="flex items-center gap-1.5">
            <MessageSquare size={13} /> {task.comments ?? 0} comments
          </span>
          <span className="flex items-center gap-1.5">
            <Paperclip size={13} /> {task.attachments ?? 0} attachments
          </span>
          <span className="ml-auto font-mono">{task.id}</span>
        </div>
      </div>
    </Drawer>
  );
}
