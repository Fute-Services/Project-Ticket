import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from './ui';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';
import { formatDateTime } from '../utils/tickets';
import { getHrTicketMessages, getItTicketMessages, sendHrTicketMessage, sendItTicketMessage } from '../utils/api';

const CHAT_POLL_MS = 8000;

// Replaces the one-line "Remarks" box: the person who raised the ticket and
// whoever is solving it talk in one thread, and every message stays on the
// ticket as its history (also after it's resolved or closed). Open from the
// queue's Remarks column or the ticket's detail drawer - same component for
// IT, HR and the employee's own My Tickets list.
export default function TicketChatDrawer({ ticket, onClose }) {
  const { user } = useAuth();
  const { refresh } = useTickets();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const isHr = ticket?._collection === 'hr';
  const ticketId = ticket?.id;

  const load = useCallback(async () => {
    if (!ticketId) return;
    try {
      const { data } = await (isHr ? getHrTicketMessages : getItTicketMessages)(ticketId);
      setMessages(data || []);
    } catch (e) {
      console.error('Failed to load ticket chat:', e.response?.data?.error || e.message);
    } finally {
      setLoaded(true);
    }
  }, [ticketId, isHr]);

  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    setText('');
    load();
  }, [load]);

  useVisibilityAwarePolling(load, CHAT_POLL_MS, Boolean(ticketId));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await (isHr ? sendHrTicketMessage : sendItTicketMessage)(ticketId, body);
      setMessages((prev) => [...prev, data]);
      setText('');
      // Keeps the queue's Remarks preview (and the other side's bell) current.
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <Drawer open={!!ticket} onClose={onClose} wide title={ticket ? `Chat - ${ticket.token}` : 'Chat'}>
      {ticket && (
        <div className="flex flex-col gap-3 text-xs font-sans">
          <div className="bg-muted/60 border border-border rounded-xl p-3 flex flex-col gap-1">
            <div className="font-semibold text-foreground break-words">{ticket.description || ticket.title}</div>
            <div className="text-muted-foreground">
              Raised by {ticket.user || '-'} · {formatDateTime(ticket.submittedAt, ticket.date)} · {ticket.status}
            </div>
          </div>

          <div className="flex flex-col gap-2 min-h-[240px] max-h-[48vh] overflow-y-auto pr-1">
            {!loaded ? (
              <div className="text-center text-muted-foreground py-8">Loading conversation...</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground py-10">
                <MessageSquare size={22} />
                <span>No messages yet. Start the conversation - it stays on this ticket as its history.</span>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      {mine ? 'You' : m.sender_name}
                      <span className="ml-1 opacity-70">({m.sender_type === 'requester' ? 'requester' : 'solver'})</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl whitespace-pre-wrap break-words text-xs ${
                        mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground border border-border rounded-bl-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime(m.created_at)}</div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex items-end gap-2 pt-2 border-t border-border">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) send(e);
              }}
              rows={2}
              maxLength={2000}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              aria-label="Ticket chat message"
              className="flex-1 resize-none bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Send message"
              className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </Drawer>
  );
}
