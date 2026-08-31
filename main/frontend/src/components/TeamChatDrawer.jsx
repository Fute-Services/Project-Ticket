import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Hash,
  User,
  Paperclip,
  Smile,
  ShieldAlert,
  CheckCircle2,
  Bell,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEscapeToClose } from '../hooks/useOverlayDismiss';

const INITIAL_CHANNELS = [
  { id: 'general', name: 'general', desc: 'Company-wide updates & general discussions' },
  { id: 'it-support', name: 'it-support', desc: 'Multi-dept IT tickets & issue escalation feed' },
  { id: 'hr-announcements', name: 'hr-announcements', desc: 'HR policies, placement drives & events' },
  { id: 'project-coordination', name: 'project-coordination', desc: 'Coordinator, Designers & Developers hub' },
];

const INITIAL_MESSAGES = {
  'general': [
    { id: 1, sender: 'Ms. Payel Saha', role: 'HR Manager', text: 'Welcome team! Q3 goals document is now published in the HR reports tab.', time: '09:30 AM' },
    { id: 2, sender: 'Founder', role: 'Founder', text: 'Great work on the portal overhaul team! Let us keep SLA compliance above 95%.', time: '10:15 AM' },
  ],
  'it-support': [
    { id: 1, sender: 'System Alert', role: 'Automated Bot', text: '🚨 New IT Ticket INC-1024 raised by Marketing: "VPN connection failing"', time: '10:00 AM', isAlert: true },
    { id: 2, sender: 'Nesamanikandan', role: 'System Administrator', text: 'Assigned ticket INC-1024 to network queue. Contacting user for diagnostics.', time: '10:05 AM' },
  ],
  'hr-announcements': [
    { id: 1, sender: 'Ms. Payel Saha', role: 'HR Manager', text: '📢 Campus Placement Drive scheduled for Aug 12 at RVCE College! 15 candidate interviews lined up.', time: '08:45 AM' },
  ],
  'project-coordination': [
    { id: 1, sender: 'Coordinator', role: 'Project Coordinator', text: 'Hey team! New UI designs for the Founder Dashboard are live in Figma.', time: '11:00 AM' },
    { id: 2, sender: 'Srinivasan Neelakandan', role: 'Developer', text: 'Reviewed and merged pull request #42 for the zero-scroll layout.', time: '11:20 AM' },
  ],
};

export default function TeamChatDrawer({ isOpen, onClose, projectChannels = [], isFullPage = false }) {
  const { user } = useAuth();
  const channels = [...INITIAL_CHANNELS, ...projectChannels];
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState(() => {
    const seeded = { ...INITIAL_MESSAGES };
    projectChannels.forEach((ch) => {
      if (!seeded[ch.id]) {
        seeded[ch.id] = [
          { id: 1, sender: 'Project Coordinator', role: 'Project Coordinator', text: `Welcome to ${ch.name}! Use this channel to coordinate with your project team.`, time: '09:00 AM' },
        ];
      }
    });
    return seeded;
  });
  const [inputText, setInputText] = useState('');

  // Only the overlay form is dismissable - the full-page view has nothing to
  // close and no onClose to call.
  useEscapeToClose(!isFullPage && isOpen, onClose);

  if (!isFullPage && !isOpen) return null;

  function handleSend(e) {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: user?.full_name || 'Founder Demo',
      role: user?.role === 'founder' ? 'Founder' : user?.role === 'hr' ? 'HR Manager' : 'Team Member',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }));

    setInputText('');
  }

  const currentChannelObj = channels.find((c) => c.id === activeChannel);
  const channelMessages = messages[activeChannel] || [];

  const content = (
    <div
      // Only the overlay form is a dialog; as a full page it's ordinary content.
      role={isFullPage ? undefined : 'dialog'}
      aria-modal={isFullPage ? undefined : 'true'}
      aria-label={isFullPage ? undefined : 'Team Collaboration Hub'}
      className={`w-full apple-glass border border-white/85 rounded-3xl flex flex-col shadow-2xl text-foreground font-sans overflow-hidden ${isFullPage ? 'h-[750px]' : 'relative w-full max-w-2xl h-[85vh] max-h-[720px]'}`}
    >
      {/* Top Header */}
      <div className="h-14 px-5 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground leading-none">Team Collaboration Hub</div>
            <div className="text-[11px] text-muted-foreground leading-none mt-1">Real-time Slack & Discord style Channel Chat</div>
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

      {/* Chat Body: Sidebar channels + Chat conversation */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Channel Sidebar */}
        <div className="w-56 bg-white/40 border-r border-black/5 p-3.5 flex flex-col gap-3 shrink-0">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">CHANNELS</div>
          <div className="flex flex-col gap-1.5">
            {channels.map((ch) => {
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-white text-foreground shadow-sm border border-white/90 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                  }`}
                >
                  <Hash size={15} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Message Feed */}
        <div className="flex-1 flex flex-col justify-between bg-white/20 min-w-0">
          {/* Channel Top Banner */}
          <div className="p-3.5 border-b border-black/5 bg-white/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Hash size={15} className="text-primary" />
              <span>{currentChannelObj?.name}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{currentChannelObj?.desc}</p>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
            {channelMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 backdrop-blur-sm ${
                  msg.isAlert
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-white/70 border-white/80 text-foreground shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground leading-none">{msg.sender}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-muted-foreground border border-black/5 font-mono">
                      {msg.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{msg.time}</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSend} className="p-3.5 border-t border-black/5 bg-white/50 backdrop-blur-xl shrink-0 flex items-center gap-2.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${currentChannelObj?.name}...`}
              className="flex-1 h-10 bg-white/70 border border-white/85 rounded-xl px-3.5 text-xs text-foreground placeholder-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
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
