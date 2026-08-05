import { motion } from 'framer-motion';
import { CheckCircle, Copy } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

// Shown after a complaint is successfully submitted
export default function TokenDisplay({ token, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Token copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="surface elev-3 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle className="text-green-400" size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Complaint Submitted!</h2>
          <p className="text-sm text-white/50">Save your token to track your complaint</p>
        </div>
        <div className="w-full bg-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
          <span className="font-mono text-lg font-black gradient-text tracking-widest">{token}</span>
          <button
            onClick={copyToken}
            className="p-2 rounded-xl hover:bg-white/10 transition text-white/50 hover:text-white"
          >
            {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>
        <p className="text-xs text-white/30">HR/IT team has been notified via email</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition btn-glow"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
