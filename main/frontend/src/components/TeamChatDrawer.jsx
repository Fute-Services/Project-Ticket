import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Hash,
  User,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEscapeToClose } from '../hooks/useOverlayDismiss';
import { chatApi } from '../utils/api';

const FIXED_CHANNELS = [
  { id: 'general', name: 'general', desc: 'Company-wide updates & general discussions' },
  { id: 'it-support', name: 'it-support', desc: 'Multi-dept IT tickets & issue escalation feed' },
  { id: 'hr-announcements', name: 'hr-announcements', desc: 'HR policies, placement drives & events' },
  { id: 'project-coordination', name: 'project-coordination', desc: 'Coordinator, Designers & Developers hub' },
];

// Polls faster than PermissionsContext's 15s (chat needs to feel live) but
// only while a channel is actually open, not in the background app-wide —
// same REST-polling approach that context already uses instead of
// WebSockets, just tuned for this feed.
const POLL_MS = 3000;

export default function TeamChatDrawer({ isOpen, onClose, projectChannels = [], isFullPage = false }) {
  const { user } = useAuth();
  const [dmChannels, setDmChannels] = useState([]); // opened-this-session DM threads: {id, name, desc, isDm}
  const channels = [...FIXED_CHANNELS, ...projectChannels, ...dmChannels];

  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [directory, setDirectory] = useState(null); // null = not loaded yet
  const [showDirectory, setShowDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  const lastMessageAtRef = useRef(null);
  const pollRef = useRef(null);

  useEscapeToClose(!isFullPage && isOpen, onClose);
  const active = isFullPage || isOpen;

  // History load + poll on every channel switch. The interval only ever
  // fetches messages newer than the last one already in state, so a poll
  // tick is a small, cheap request even on a channel with lots of history.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function loadHistory() {
      setMessages([]);
      lastMessageAtRef.current = null;
      try {
        const { data } = await chatApi.listMessages(activeChannel);
        if (cancelled) return;
        setMessages(data);
        if (data.length) lastMessageAtRef.current = data[data.length - 1].created_at;
      } catch (e) {
        console.error('Failed to load chat history:', e.response?.data?.error || e.message);
      }
    }

    async function poll() {
      try {
        const { data } = await chatApi.listMessages(activeChannel, lastMessageAtRef.current || undefined);
        if (cancelled || !data.length) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = data.filter((m) => !seen.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastMessageAtRef.current = data[data.length - 1].created_at;
      } catch (e) {
        console.error('Chat poll failed:', e.response?.data?.error || e.message);
      }
    }

    loadHistory();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [activeChannel, active]);

  async function handleSend(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data } = await chatApi.send(activeChannel, text);
      setMessages((prev) => [...prev, data]);
      lastMessageAtRef.current = data.created_at;
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  }

  const loadDirectory = useCallback(async () => {
    if (directory) return;
    try {
      const { data } = await chatApi.directory();
      setDirectory(data);
    } catch (e) {
      console.error('Failed to load directory:', e.response?.data?.error || e.message);
    }
  }, [directory]);

  async function openDm(person) {
    const { data } = await chatApi.resolveDm(person.id);
    setDmChannels((prev) => (prev.some((c) => c.id === data.channelId) ? prev : [...prev, { id: data.channelId, name: person.full_name, desc: 'Direct message', isDm: true }]));
    setActiveChannel(data.channelId);
    setShowDirectory(false);
    setDirectorySearch('');
  }

  if (!active) return null;

  const currentChannelObj = channels.find((c) => c.id === activeChannel);
  const filteredDirectory = (directory || []).filter((p) => p.full_name.toLowerCase().includes(directorySearch.toLowerCase()));

  const content = (
    <div
      role={isFullPage ? undefined : 'dialog'}
      aria-modal={isFullPage ? undefined : 'true'}
      aria-label={isFullPage ? undefined : 'Team Collaboration Hub'}
      className={`w-full apple-glass border border-white/85 rounded-3xl flex flex-col shadow-2xl text-foreground font-sans overflow-hidden ${isFullPage ? 'h-[750px]' : 'relative w-full max-w-2xl h-[85vh] max-h-[720px]'}`}
    >
      <div className="h-14 px-5 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground leading-none">Team Collaboration Hub</div>
            <div className="text-[11px] text-muted-foreground leading-none mt-1">Channels & direct messages</div>
          </div>
        </div>
        {!isFullPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/60 hover:bg-white border border-white/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-56 bg-white/40 border-r border-black/5 p-3.5 flex flex-col gap-3 shrink-0 overflow-y-auto">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">CHANNELS</div>
          <div className="flex flex-col gap-1.5">
            {[...FIXED_CHANNELS, ...projectChannels].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  activeChannel === ch.id
                    ? 'bg-white text-foreground shadow-sm border border-white/90 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                }`}
              >
                <Hash size={15} className={activeChannel === ch.id ? 'text-primary' : 'text-muted-foreground'} />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-2 mt-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">DIRECT MESSAGES</div>
            <button
              type="button"
              onClick={() => {
                setShowDirectory((v) => !v);
                loadDirectory();
              }}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              + New
            </button>
          </div>
          {showDirectory && (
            <div className="bg-white/70 border border-white/85 rounded-xl p-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <Search size={12} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Search people…"
                  className="w-full text-[11px] bg-transparent focus-visible:outline-none placeholder-muted-foreground"
                />
              </div>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                {filteredDirectory.length === 0 && <div className="text-[10px] text-muted-foreground px-2 py-1">No matches</div>}
                {filteredDirectory.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openDm(p)}
                    className="text-left px-2 py-1.5 rounded-lg text-[11px] font-medium hover:bg-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <User size={12} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{p.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {dmChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  activeChannel === ch.id
                    ? 'bg-white text-foreground shadow-sm border border-white/90 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                }`}
              >
                <User size={15} className={activeChannel === ch.id ? 'text-primary' : 'text-muted-foreground'} />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between bg-white/20 min-w-0">
          <div className="p-3.5 border-b border-black/5 bg-white/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              {currentChannelObj?.isDm ? <User size={15} className="text-primary" /> : <Hash size={15} className="text-primary" />}
              <span>{currentChannelObj?.name}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{currentChannelObj?.desc}</p>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8">No messages yet — say hello 👋</div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 backdrop-blur-sm ${
                  msg.senderId === user?.id ? 'bg-primary/10 border-primary/20 text-foreground ml-8' : 'bg-white/70 border-white/80 text-foreground shadow-sm mr-8'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground leading-none">{msg.senderName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-muted-foreground border border-black/5 font-mono">
                      {msg.senderRole}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mt-0.5 whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-3.5 border-t border-black/5 bg-white/50 backdrop-blur-xl shrink-0 flex items-center gap-2.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${currentChannelObj?.isDm ? currentChannelObj?.name : `#${currentChannelObj?.name}`}...`}
              className="flex-1 h-10 bg-white/70 border border-white/85 rounded-xl px-3.5 text-xs text-foreground placeholder-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
            />
            <button
              type="submit"
              disabled={sending}
              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
      {content}
    </div>
  );
}
