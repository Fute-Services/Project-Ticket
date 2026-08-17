import { useEffect, useState } from 'react';
import { Inbox, Send, FileEdit, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, EmptyState } from '../../components/ui';
import { emails as SEED } from '../../data/hrMockData';
import { sendHrEmail, getSentHrEmails } from '../../utils/api';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileEdit },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
];

export default function Email() {
  const [emails, setEmails] = useState(SEED);
  const [folder, setFolder] = useState('inbox');
  const [selected, setSelected] = useState(SEED.inbox[0]?.id || null);
  const [replyText, setReplyText] = useState('');

  // Sent mail is real (backend/utils/mailer.js over SMTP) — inbox/drafts/
  // templates stay simulated below since actually receiving mail would need
  // separate IMAP/webhook infrastructure this app doesn't have.
  useEffect(() => {
    getSentHrEmails()
      .then(({ data }) => setEmails((prev) => ({ ...prev, sent: data })))
      .catch((e) => console.error('Failed to load sent emails:', e.message));
  }, []);

  const list = emails[folder] || [];
  const activeEmail = folder === 'inbox' ? emails.inbox.find((e) => e.id === selected) : null;
  const activeDraft = folder === 'drafts' ? emails.drafts.find((d) => d.id === selected) : null;

  function goToFolder(id) {
    setFolder(id);
    setSelected(emails[id]?.[0]?.id ?? null);
    setReplyText('');
  }

  // Appends the reply to the thread (and clears the input) only once the
  // send has actually succeeded — previously this happened first, so a
  // failed send still left a reply in the thread looking delivered, with
  // only an easy-to-miss toast as the only sign it never went out.
  function sendReply() {
    if (!replyText.trim() || !activeEmail) return;
    const body = replyText.trim();
    const subject = `Re: ${activeEmail.subject}`;
    const to = activeEmail.from;
    const id = activeEmail.id;

    sendHrEmail({ to, subject, body })
      .then(({ data }) => {
        const message = { from: 'You (HR)', to, body, time: 'Just now' };
        setEmails((prev) => ({
          ...prev,
          inbox: prev.inbox.map((e) => (e.id === id ? { ...e, unread: false, thread: [...e.thread, message] } : e)),
          sent: [data, ...prev.sent],
        }));
        setReplyText('');
        toast.success('Email sent', { description: `To ${to}` });
      })
      .catch((e) => toast.error('Failed to send email', { description: e.response?.data?.error || e.message }));
  }

  function useTemplate(template) {
    const draft = { id: `ED-${Date.now()}`, to: '', subject: template.subject, preview: '', body: '', time: 'Just now' };
    setEmails((prev) => ({ ...prev, drafts: [draft, ...prev.drafts] }));
    setFolder('drafts');
    setSelected(draft.id);
  }

  function updateDraft(patch) {
    setEmails((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === activeDraft.id ? { ...d, ...patch, preview: (patch.body ?? d.body ?? '').slice(0, 80) } : d)),
    }));
  }

  // Only deletes the draft once it's actually sent — this used to delete
  // first, so a failed send permanently lost the composed content with no
  // undo, leaving only a toast as the trace.
  function sendDraft() {
    if (!activeDraft?.to.trim() || !activeDraft?.subject.trim()) return;
    const { id, to, subject, body } = activeDraft;
    sendHrEmail({ to, subject, body: body || '' })
      .then(({ data }) => {
        setEmails((prev) => ({ ...prev, drafts: prev.drafts.filter((d) => d.id !== id), sent: [data, ...prev.sent] }));
        setSelected(null);
        toast.success('Email sent', { description: `To ${to}` });
      })
      .catch((e) => toast.error('Failed to send email', { description: e.response?.data?.error || e.message }));
  }

  function discardDraft() {
    setEmails((prev) => ({ ...prev, drafts: prev.drafts.filter((d) => d.id !== activeDraft.id) }));
    setSelected(null);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Email Dashboard" subtitle="Every HR email, without leaving the workspace" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
          {/* Folder rail */}
          <Card className="lg:col-span-2 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => goToFolder(f.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={15} />
                  {f.label}
                  <span className="ml-auto text-xs text-muted-foreground">{emails[f.id]?.length || 0}</span>
                </button>
              );
            })}
          </Card>

          {/* List */}
          <Card className="lg:col-span-4 p-0 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              {list.length === 0 ? (
                <EmptyState text="Nothing here." />
              ) : (
                list.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-border hover:bg-accent transition-colors cursor-pointer ${
                      selected === item.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs truncate ${item.unread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {item.from || item.to || item.subject || 'Untitled'}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{item.time}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                    {item.preview && <div className="text-xs text-muted-foreground truncate mt-0.5">{item.preview}</div>}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Reading / compose pane */}
          <Card className="lg:col-span-6">
            {folder === 'inbox' && activeEmail ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-sm font-bold text-foreground">{activeEmail.subject}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{activeEmail.from}</div>
                </div>
                <div className="flex flex-col gap-3">
                  {activeEmail.thread.map((msg, i) => (
                    <div key={i} className="p-3.5 rounded-lg bg-muted border border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">{msg.from}</span>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{msg.body}</p>
                    </div>
                  ))}
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!replyText.trim()}
                  className="self-end bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Send Reply
                </button>
              </div>
            ) : folder === 'drafts' && activeDraft ? (
              <div className="flex flex-col gap-3">
                <input
                  value={activeDraft.to}
                  onChange={(e) => updateDraft({ to: e.target.value })}
                  placeholder="To: recipient@email.com"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  value={activeDraft.subject}
                  onChange={(e) => updateDraft({ subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold"
                />
                <textarea
                  value={activeDraft.body || ''}
                  onChange={(e) => updateDraft({ body: e.target.value })}
                  placeholder="Write your message..."
                  rows={8}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={discardDraft} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 cursor-pointer">
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={sendDraft}
                    disabled={!activeDraft.to.trim() || !activeDraft.subject.trim()}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : folder === 'templates' ? (
              <div className="flex flex-col gap-3">
                {emails.templates.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.subject}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => useTemplate(t)}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Use template
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Select an email to read it here." />
            )}
          </Card>
        </div>
      </div>
    </HrLayout>
  );
}
