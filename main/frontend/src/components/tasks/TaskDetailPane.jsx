import { useState } from 'react';
import { Check, Figma, Github, Paperclip, Send, Plus, X, Ban } from 'lucide-react';
import { Drawer, Field, inputClass } from '../ui';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../data/coordinatorMockData';

function toHref(link) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

function newChecklistId() {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Task detail as a right-side pane - Asana's model, where opening a task
 * never takes you off the list you were scanning.
 *
 * `readOnly` renders the same layout without inputs, which is what the
 * Employee dashboard needs: people should see the full task without being
 * able to reassign it to someone else.
 */
export default function TaskDetailPane({ task, project, open, onClose, onChange, onToggle, onAddRemark, onUpdateProgress, allTasks = [], readOnly = false, employees = [] }) {
  const [remarkDraft, setRemarkDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState('');

  if (!task) return null;
  const done = task.status === 'Completed';

  const set = (patch) => onChange?.(task.id, patch);

  async function submitRemark(e) {
    e.preventDefault();
    const text = remarkDraft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await onAddRemark?.(task.id, text);
      setRemarkDraft('');
    } finally {
      setPosting(false);
    }
  }

  const checklist = task.checklist || [];
  const blocker = task.blockedBy ? allTasks.find((t) => t.id === task.blockedBy) : null;
  const isBlocked = blocker && blocker.status !== 'Completed';
  const sameProjectTasks = allTasks.filter((t) => t.projectId === task.projectId && t.id !== task.id);

  function addChecklistItem(e) {
    e.preventDefault();
    const text = checklistDraft.trim();
    if (!text) return;
    onUpdateProgress?.(task.id, { checklist: [...checklist, { id: newChecklistId(), text, done: false }] });
    setChecklistDraft('');
  }

  function toggleChecklistItem(id) {
    onUpdateProgress?.(task.id, { checklist: checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
  }

  function removeChecklistItem(id) {
    onUpdateProgress?.(task.id, { checklist: checklist.filter((c) => c.id !== id) });
  }

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
          {isBlocked && (
            <span title={`Blocked by "${blocker.title}"`} className="mt-1 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap shrink-0">
              <Ban size={11} /> Blocked
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assignee">
            {readOnly ? (
              <p className="text-sm text-foreground">{task.assignee || '-'}</p>
            ) : (
              <select value={task.assigneeId || ''} onChange={(e) => set({ assigneeId: e.target.value })} className={inputClass}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
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

          <Field label="Actual hours">
            {onUpdateProgress ? (
              <input
                key={`hours-${task.id}-${task.actualHours}`}
                type="number"
                min="0"
                step="0.5"
                defaultValue={task.actualHours || ''}
                onBlur={(e) => onUpdateProgress(task.id, { actualHours: e.target.value === '' ? 0 : Number(e.target.value) })}
                className={inputClass}
              />
            ) : (
              <p className="text-sm text-foreground">{task.actualHours || 0}</p>
            )}
          </Field>

          {!readOnly && (
            <Field label="Blocked by">
              <select value={task.blockedBy || ''} onChange={(e) => set({ blockedBy: e.target.value })} className={inputClass}>
                <option value="">— None —</option>
                {sameProjectTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Checklist {checklist.length > 0 && `(${checklist.filter((c) => c.done).length}/${checklist.length})`}</p>
          <div className="flex flex-col gap-1.5">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 group">
                <input type="checkbox" checked={c.done} onChange={() => toggleChecklistItem(c.id)} className="cursor-pointer" />
                <span className={`text-xs flex-1 ${c.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{c.text}</span>
                {onUpdateProgress && (
                  <button type="button" onClick={() => removeChecklistItem(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer transition-opacity">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {onUpdateProgress && (
            <form onSubmit={addChecklistItem} className="flex items-center gap-2 mt-2">
              <input
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                placeholder="Add a subtask…"
                className={`${inputClass} flex-1`}
              />
              <button type="submit" disabled={!checklistDraft.trim()} aria-label="Add subtask" className="p-2 rounded-md bg-muted hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0">
                <Plus size={14} />
              </button>
            </form>
          )}
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

        <div className="pt-3 border-t border-border flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Remarks / Updates</p>
          {task.remarks ? (
            <div className="p-2.5 rounded-md bg-muted text-xs text-foreground">
              <p className="whitespace-pre-wrap">{task.remarks}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {task.remarksBy} · {task.remarksAt ? new Date(task.remarksAt).toLocaleString() : ''}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No updates yet.</p>
          )}
          {onAddRemark && (
            <form onSubmit={submitRemark} className="flex items-center gap-2">
              <input
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                placeholder="Post a progress update…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                disabled={posting || !remarkDraft.trim()}
                aria-label="Post update"
                className="p-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Paperclip size={13} /> {task.attachments ?? 0} attachments
          </span>
          <span className="ml-auto font-mono">{task.id}</span>
        </div>
      </div>
    </Drawer>
  );
}
