import React, { useState } from 'react';
import { X, Plus, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../data/itMockData';

export default function NewItTicketModal({ isOpen, onClose, onSubmitSuccess }) {
  const [category, setCategory] = useState('Laptop / Desktop / Server');
  const [subcategory, setSubcategory] = useState(TICKET_CATEGORIES['Laptop / Desktop / Server'][0]);
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubcategory(TICKET_CATEGORIES[cat][0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      if (onSubmitSuccess) {
        onSubmitSuccess({
          category,
          subcategory,
          priority,
          description,
          department,
          status: 'Open',
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
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-none">Raise IT Support Ticket</h3>
              <p className="text-[11px] text-gray-400 mt-1">Submit a new issue or service request</p>
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
            <h4 className="text-lg font-bold text-white mb-1">Ticket Created Successfully!</h4>
            <p className="text-xs text-gray-400">
              An IT Helpdesk Engineer has been assigned to your issue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Category Select */}
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e86024]"
              >
                {Object.keys(TICKET_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Select */}
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">Subcategory</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e86024]"
              >
                {TICKET_CATEGORIES[category].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e86024]"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e86024]"
                />
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Issue Description <span className="text-[#e86024]">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] resize-none"
              />
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
                <span>Create Ticket</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
