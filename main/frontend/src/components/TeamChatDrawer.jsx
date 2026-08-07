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

const INITIAL_CHANNELS = [
  { id: 'general', name: 'general', desc: 'Company-wide updates & general discussions' },
  { id: 'it-support', name: 'it-support', desc: 'Multi-dept IT tickets & issue escalation feed' },
  { id: 'hr-announcements', name: 'hr-announcements', desc: 'HR policies, placement drives & events' },
  { id: 'project-coordination', name: 'project-coordination', desc: 'Coordinator, Designers & Developers hub' },
];

const INITIAL_MESSAGES = {
  'general': [
    { id: 1, sender: 'Payal Shah', role: 'HR Manager', text: 'Welcome team! Q3 goals document is now published in the HR reports tab.', time: '09:30 AM' },
    { id: 2, sender: 'Founder', role: 'Founder', text: 'Great work on the portal overhaul team! Let us keep SLA compliance above 95%.', time: '10:15 AM' },
  ],
  'it-support': [
    { id: 1, sender: 'System Alert', role: 'Automated Bot', text: '🚨 New IT Ticket INC-1024 raised by Marketing: "VPN connection failing"', time: '10:00 AM', isAlert: true },
    { id: 2, sender: 'Meera Pillai', role: 'IT Support', text: 'Assigned ticket INC-1024 to network queue. Contacting user for diagnostics.', time: '10:05 AM' },
  ],
  'hr-announcements': [
    { id: 1, sender: 'Payal Shah', role: 'HR Manager', text: '📢 Campus Placement Drive scheduled for Aug 12 at RVCE College! 15 candidate interviews lined up.', time: '08:45 AM' },
  ],
  'project-coordination': [
    { id: 1, sender: 'Coordinator', role: 'Project Coordinator', text: 'Hey team! New UI designs for the Founder Dashboard are live in Figma.', time: '11:00 AM' },
    { id: 2, sender: 'Rahul Sen', role: 'Engineering Manager', text: 'Reviewed and merged pull request #42 for the zero-scroll layout.', time: '11:20 AM' },
  ],
};

export default function TeamChatDrawer({ isOpen, onClose, projectChannels = [] }) {
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-[85vh] max-h-[720px] bg-[#111115] border border-white/10 rounded-3xl flex flex-col shadow-2xl text-white font-sans overflow-hidden">
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#16161c] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white leading-none">Team Collaboration Hub</div>
              <div className="text-[10px] text-gray-400 leading-none mt-0.5">Real-time Slack/Discord-style Chat</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Body: Sidebar channels + Chat conversation */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Channel Sidebar */}
          <div className="w-48 bg-[#0d0d10] border-r border-white/5 p-3 flex flex-col gap-3 shrink-0">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">CHANNELS</div>
            <div className="flex flex-col gap-1">
              {channels.map((ch) => {
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#e86024] text-white shadow-md shadow-orange-950/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Hash size={14} className={isActive ? 'text-white' : 'text-gray-500'} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Message Feed */}
          <div className="flex-1 flex flex-col justify-between bg-[#141418] min-w-0">
            {/* Channel Top Banner */}
            <div className="p-3 border-b border-white/5 bg-[#17171c] shrink-0">
              <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                <Hash size={14} className="text-[#e86024]" />
                <span>{currentChannelObj?.name}</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{currentChannelObj?.desc}</p>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
              {channelMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl border text-xs flex flex-col gap-1 ${
                    msg.isAlert
                      ? 'bg-red-500/10 border-red-500/20 text-red-200'
                      : 'bg-[#1a1a20] border-white/5 text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white leading-none">{msg.sender}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 font-mono">
                        {msg.role}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed mt-0.5">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-[#17171c] shrink-0 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message #${currentChannelObj?.name}...`}
                className="flex-1 h-9 bg-[#1a1a20] border border-white/10 rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] transition-colors"
              />
              <button
                type="submit"
                className="h-9 px-3.5 rounded-xl bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-all cursor-pointer shrink-0"
              >
                <span>Send</span>
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
