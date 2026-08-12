import React, { useState, useEffect } from 'react';
import { X, UserPlus, ArrowRight, CheckCircle2, ShieldAlert, Paperclip, FileText, AlertCircle } from 'lucide-react';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';
import { useAuth } from '../context/AuthContext';

export const HR_TICKET_CATEGORIES = {
  'Payroll & Salary': [
    'Missing Payslip',
    'Incorrect Deductions',
    'Reimbursement Approval',
    'Overtime Calculation',
  ],
  'Leave & Attendance': [
    'Attendance Regularization',
    'Leave Balance Discrepancy',
    'WFH Extension',
    'Comp Off Approval',
  ],
  'Benefits & Insurance': [
    'Health Insurance Claim',
    'PF/ESI Query',
    'Wellness Perks',
    'Medical Policy',
  ],
  'HR Documents & Certificates': [
    'Relieving Letter',
    'Experience Certificate',
    'Bonafide Proof',
    'Address Proof',
  ],
  'Workplace & Grievances': [
    'Policy Clarification',
    'Workplace Issue',
    'Confidential Concern',
    'POSH Inquiry',
  ],
};

export const HR_PRIORITIES = [
  { id: 'Low', label: 'Low', desc: 'General query (e.g., Address proof letter)' },
  { id: 'Medium', label: 'Medium', desc: 'Standard request (e.g., Leave balance update)' },
  { id: 'High', label: 'High / Urgent', desc: 'Critical issue (e.g., Insurance emergency, Payroll)' },
];

export default function NewHrTicketModal({ isOpen, onClose, onSubmitSuccess }) {
  const { user } = useAuth();
  const [category, setCategory] = useState('Payroll & Salary');
  const [subcategory, setSubcategory] = useState(HR_TICKET_CATEGORIES['Payroll & Salary'][0]);
  const [priority, setPriority] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isConfidential, setIsConfidential] = useState(false);
  const [employeeId, setEmployeeId] = useState(user?.employeeId || user?.employee_id || '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.employeeId || user?.employee_id) {
      setEmployeeId(user.employeeId || user.employee_id);
    }
  }, [user]);

  useEscapeToClose(isOpen && !submitted, onClose);

  if (!isOpen) return null;

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubcategory(HR_TICKET_CATEGORIES[cat][0]);
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0].name);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const userRole = user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee');

    setTimeout(() => {
      if (onSubmitSuccess) {
        onSubmitSuccess({
          id: `HR-${Math.floor(1000 + Math.random() * 9000)}`,
          token: `HR-${Math.floor(1000 + Math.random() * 9000)}`,
          title: title.trim() || `${subcategory} Request`,
          category,
          subcategory,
          priority,
          description,
          role: userRole,
          department: userRole,
          dept: 'HR',
          isConfidential,
          attachment,
          employeeId: employeeId || user?.employeeId || user?.employee_id || '',
          status: 'Open',
          createdAt: 'Just now',
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
        aria-label="Raise HR Support Ticket"
        className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Raise HR Support Ticket</h2>
              <p className="text-xs text-muted-foreground">Submit payroll, attendance, policy, or grievance queries to HR</p>
            </div>
          </div>

          {!submitted && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {submitted ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">HR Ticket Submitted!</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your request has been logged in HR Helpdesk. {isConfidential ? 'It has been routed confidentially.' : 'HR team has been notified.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Employee ID & Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={user?.employee_id || user?.employeeId || employeeId || ''}
                  readOnly
                  disabled
                  className="w-full h-10 bg-muted border border-border rounded-xl px-3.5 text-xs text-primary font-bold focus:outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <input
                  type="text"
                  value={user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee')}
                  readOnly
                  disabled
                  className="w-full h-10 bg-muted border border-border rounded-xl px-3.5 text-xs text-foreground font-bold focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                HR Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs text-foreground font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.keys(HR_TICKET_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Select */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs text-foreground font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {HR_TICKET_CATEGORIES[category]?.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {HR_PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex flex-col items-center text-center transition-all cursor-pointer ${priority === p.id
                        ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[9px] font-normal leading-tight opacity-80 mt-0.5">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Subject / Title */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subject / Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Correction needed in July Salary Slip - Overtime missing"
                className="w-full h-10 bg-background border border-border rounded-xl px-3.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Detailed Description <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your query or issue in detail..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Document Attachment (Optional)
              </label>
              <div className="relative border border-dashed border-border rounded-xl p-3 text-center bg-muted/30 hover:bg-accent transition-colors cursor-pointer flex flex-col items-center justify-center gap-1">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Paperclip size={16} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {attachment ? <strong className="text-primary">{attachment}</strong> : 'Click to attach proof (Receipts, Medical bills, PDFs)'}
                </span>
              </div>
            </div>

            {/* Confidential Checkbox */}
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="confidential-check"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-0.5 rounded border-border text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="confidential-check" className="text-xs text-foreground cursor-pointer select-none">
                <strong className="text-orange-500 font-bold block">Mark as Confidential</strong>
                This ticket will be routed directly to Senior HR & Founder escalation queue.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <span>Submit HR Ticket</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
