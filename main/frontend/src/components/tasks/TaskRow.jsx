import { Check, CalendarDays } from 'lucide-react';
import { Badge } from '../ui';

const TODAY = '2026-08-06';

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Overdue and due-today read differently — that's the whole point of the column. */
function dueTone(dueDate, done) {
  if (done || !dueDate) return 'text-muted-foreground';
  if (dueDate < TODAY) return 'text-destructive font-medium';
  if (dueDate === TODAY) return 'text-warning font-medium';
  return 'text-muted-foreground';
}

function dueLabel(dueDate) {
  if (!dueDate) return 'No date';
  if (dueDate === TODAY) return 'Today';
  return dueDate.slice(5); // MM-DD — the year is noise in a task list
}

/**
 * One task as a dense row, in the Asana idiom: a round completion control on
 * the left, the name as the primary hit target, and supporting metadata
 * right-aligned so the eye can scan a column of names uninterrupted.
 *
 * Deliberately a row rather than a card — cards make every task look equally
 * important and waste vertical space at this density.
 */
export default function TaskRow({ task, project, onToggle, onOpen, showProject = true }) {
  const done = task.status === 'Completed';

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 border-b border-border last:border-0 transition-colors hover:bg-muted/60 ${
        done ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle?.(task.id)}
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
        className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
          done
            ? 'bg-success border-success text-success-foreground'
            : 'border-muted-foreground/40 text-transparent hover:border-success hover:text-success/50'
        }`}
      >
        <Check size={11} strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
      >
        <span className={`text-sm truncate block ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </span>
      </button>

      {showProject && project && (
        <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 max-w-[160px]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
          <span className="truncate">{project.name}</span>
        </span>
      )}

      <span className={`hidden sm:flex items-center gap-1 text-xs shrink-0 w-[74px] ${dueTone(task.dueDate, done)}`}>
        <CalendarDays size={12} aria-hidden="true" />
        {dueLabel(task.dueDate)}
      </span>

      <span className="hidden md:block shrink-0">
        <Badge value={task.priority} />
      </span>

      <span
        title={task.assignee}
        className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-medium flex items-center justify-center shrink-0"
      >
        {initials(task.assignee)}
      </span>
    </div>
  );
}
