import React, { useState } from 'react';
import { X, Server, Folder, ArrowRight, CheckCircle2 } from 'lucide-react';

const SERVERS = ['Server 70', 'Server 50', 'Server 29', 'Server 131', 'Anima'];

export default function DataTransferModal({ isOpen, onClose, onSubmitSuccess }) {
  const [sourceServer, setSourceServer] = useState('Server 70');
  const [destServer, setDestServer] = useState('Server 131');
  const [folderName, setFolderName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
          status: 'Waiting Approval',
        });
      }
      setSubmitted(false);
      onClose();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[#141418] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e86024]/10 border border-[#e86024]/20 flex items-center justify-center text-[#e86024]">
              <Server size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-none">New Data Transfer Request</h3>
              <p className="text-[11px] text-gray-400 mt-1">Request server-to-server data copy/migration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-emerald-400 mb-3 animate-bounce" />
            <h4 className="text-lg font-bold text-white mb-1">Request Submitted!</h4>
            <p className="text-xs text-gray-400">
              Sent to Approval Center. Waiting for IT Manager approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Server Selection Row */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#18181c] border border-white/5 rounded-2xl items-center">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Source Server
                </label>
                <select
                  value={sourceServer}
                  onChange={(e) => setSourceServer(e.target.value)}
                  className="w-full bg-[#141418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e86024]"
                >
                  {SERVERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Destination Server
                </label>
                <select
                  value={destServer}
                  onChange={(e) => setDestServer(e.target.value)}
                  className="w-full bg-[#141418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e86024]"
                >
                  {SERVERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Folder Name & Path */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Folder Name <span className="text-[#e86024]">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Project_Backup_2026"
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Folder Path <span className="text-[#e86024]">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="e.g. D:\Data\Project_Backup_2026"
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Purpose / Description
                </label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Explain why this data transfer is required..."
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#e86024] hover:bg-[#d4521a] text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
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
