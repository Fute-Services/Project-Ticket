import { MessageSquare } from 'lucide-react';
import { formatDateTime } from '../utils/tickets';

// Shared table cells for the employee's ticket lists (the IT/HR queue in
// TicketsQueueView renders the same two cells for staff).

// Exact date on top, exact time underneath - old tickets that never stored a
// full timestamp just show their plain date.
export function TicketDateCell({ t }) {
  const stamp = formatDateTime(t.submittedAt, t.date || '-');
  const sep = stamp.indexOf(', ', 7);
  return (
    <span className="text-muted-foreground text-xs whitespace-nowrap leading-tight" title={stamp}>
      {sep === -1 ? (
        stamp
      ) : (
        <>
          {stamp.slice(0, sep)}
          <br />
          <span className="text-foreground font-medium">{stamp.slice(sep + 2)}</span>
        </>
      )}
    </span>
  );
}

// The old free-text Remarks cell, now the entry point to the ticket's chat:
// shows the latest message and opens the full conversation on click.
export function RemarksChatCell({ t, onOpen }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(t.id);
      }}
      title="Open chat with the solver"
      aria-label={`Open chat for ticket ${t.token || t.id}`}
      className="w-full flex items-center gap-1.5 bg-background hover:bg-muted border border-input rounded-md px-2 py-1 text-xs text-left shadow-sm cursor-pointer"
    >
      <MessageSquare size={13} className={t.lastMessageBy === 'solver' ? 'text-primary shrink-0' : 'text-muted-foreground shrink-0'} />
      <span className={`truncate ${t.remarks ? 'text-foreground' : 'text-muted-foreground/60'}`}>{t.remarks || 'Open chat...'}</span>
    </button>
  );
}
