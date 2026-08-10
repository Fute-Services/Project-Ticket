import React, { useId, useState } from 'react';
import { X, Server, Folder, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';

// Server 100 and 121 carry a named approver instead of the standard queue —
// see the routing rules in DashboardPage's handleNewDataRequest.
const SERVERS = ['Server 70', 'Server 50', 'Server 29', 'Server 131', 'Server 100', 'Server 121', 'Anima'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function DataTransferModal({ isOpen, onClose, onSubmitSuccess }) {
  const [sourceServer, setSourceServer] = useState('Server 70');
  const [destServer, setDestServer] = useState('Server 131');
  const [folderName, setFolderName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterNumber, setRequesterNumber] = useState('');
  const [backupName, setBackupName] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitted, setSubmitted] = useState(false);

  // Every label in this form used to sit next to its control with no
  // htmlFor/id pairing — visually correct, but announced to screen readers
  // and password managers as unlabelled (same class of bug fixed earlier in
  // IconField). Real ids fix that instead of just looking right.
  const uid = useId();
  const ids = {
    source: `${uid}-source`,
    dest: `${uid}-dest`,
    requesterName: `${uid}-requesterName`,
    requesterNumber: `${uid}-requesterNumber`,
    folderName: `${uid}-folderName`,
    folderPath: `${uid}-folderPath`,
    purpose: `${uid}-purpose`,
    backupName: `${uid}-backupName`,
    priority: `${uid}-priority`,
  };

  useEscapeToClose(isOpen && !submitted, onClose);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      if (onSubmitSuccess) {
        onSubmitSuccess({
          source: sourceServer,
          destination: destServer,
          folder: folderName,
          path: folderPath,
          purpose,
          requesterName,
          requesterNumber,
          backupName,
          priority,
          status: 'Waiting Approval',
        });
      }
      setSubmitted(false);
      onClose();
    }, 1200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn font-sans"
      {...(submitted ? {} : backdropProps(onClose))}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New Data Transfer Request"
        className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Server size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground leading-none">New Data Transfer Request</h3>
              <p className="text-xs text-muted-foreground mt-1">Request server-to-server data copy/migration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-primary mb-3 animate-bounce" />
            <h4 className="text-lg font-bold text-foreground mb-1">Request Submitted!</h4>
            <p className="text-xs text-muted-foreground">
              Sent to Approval Center. Waiting for IT Manager approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Server Selection Row */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted border border-border rounded-lg items-center">
              <div>
                <label htmlFor={ids.source} className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Source Server
                </label>
                <select
                  id={ids.source}
                  value={sourceServer}
                  onChange={(e) => setSourceServer(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {SERVERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={ids.dest} className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Destination Server
                </label>
                <select
                  id={ids.dest}
                  value={destServer}
                  onChange={(e) => setDestServer(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {SERVERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requester details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.requesterName} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Requester Name <span className="text-primary">*</span>
                </label>
                <input
                  id={ids.requesterName}
                  required
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor={ids.requesterNumber} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Contact Number <span className="text-primary">*</span>
                </label>
                <input
                  id={ids.requesterNumber}
                  required
                  type="tel"
                  value={requesterNumber}
                  onChange={(e) => setRequesterNumber(e.target.value)}
                  placeholder="e.g. 98765 43210"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Folder Name & Path */}
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor={ids.folderName} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Folder Name <span className="text-primary">*</span>
                </label>
                <input
                  id={ids.folderName}
                  required
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Project_Backup_2026"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor={ids.folderPath} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Folder Path <span className="text-primary">*</span>
                </label>
                <input
                  id={ids.folderPath}
                  required
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="e.g. D:\Data\Project_Backup_2026"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor={ids.purpose} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Purpose / Description
                </label>
                <textarea
                  id={ids.purpose}
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Explain why this data transfer is required..."
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.backupName} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Backup Name
                </label>
                <input
                  id={ids.backupName}
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="e.g. Nightly_Backup_Aug"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor={ids.priority} className="text-xs font-semibold text-muted-foreground block mb-1">
                  Priority
                </label>
                <select
                  id={ids.priority}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-primary-foreground flex items-center gap-2 shadow transition-all cursor-pointer"
              >
                <span>Submit for Approval</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
