import React, { useState, useEffect } from 'react';
import { X, UserPlus, ArrowRight, CheckCircle2, ShieldAlert, Link2, FileText, AlertCircle } from 'lucide-react';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';
import { useAuth } from '../context/AuthContext';
import { ColorSelect } from './TicketsQueueView';

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
  const [attachment, setAttachment] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [employeeId, setEmployeeId] = useState(user?.employeeId || user?.employee_id || '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.employeeId || user?.employee_id) {
      setEmployeeId(user.employeeId || user.employee_id);
    }
  }, [user]);

  useEscapeToClose(isOpen && !submitted && !submitting, onClose);

  if (!isOpen) return null;

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubcategory(HR_TICKET_CATEGORIES[cat][0]);
  }

  const isValidDriveLink = /^https:\/\/(drive|docs)\.google\.com\//.test(attachment?.trim() || '');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!onSubmitSuccess) return;
    const userRole = user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee');
    setError('');
    if (attachment.trim() && !isValidDriveLink) {
      setError('Document Attachment must be a Google Drive link (drive.google.com or docs.google.com).');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitSuccess({
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
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not submit the ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#671421]/10 border border-[#671421]/20 flex items-center justify-center text-[#671421]">
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
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">HR Ticket Submitted!</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your request has been logged in HR Helpdesk. {isConfidential ? 'It has been routed confidentially.' : 'HR team has been notified.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Employee ID, Role, Category, Subcategory */}
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

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  HR Issue Category
                </label>
                <ColorSelect
                  value={category}
                  onChange={handleCategoryChange}
                  options={Object.keys(HR_TICKET_CATEGORIES)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Subcategory
                </label>
                <ColorSelect
                  value={subcategory}
                  onChange={setSubcategory}
                  options={HR_TICKET_CATEGORIES[category] || []}
                />
              </div>
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
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex flex-col items-center text-center transition-all cursor-pointer ${priority === p.id
                        ? 'bg-[#671421] text-white border-[#360C13] shadow-md shadow-black/10'
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
                className="w-full h-10 bg-background border border-border rounded-xl px-3.5 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Detailed Description <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your query or issue in detail..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Attachment & Confidential */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <div className={`relative border rounded-xl p-2.5 bg-muted/30 flex items-start gap-2 ${attachment.trim() && !isValidDriveLink ? 'border-destructive' : 'border-border'}`}>
                <Link2 size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <strong className="text-foreground font-bold text-[11px] block mb-0.5">Document Attachment (Optional)</strong>
                  <input
                    type="url"
                    value={attachment}
                    onChange={(e) => setAttachment(e.target.value)}
                    placeholder="Paste Google Drive link (with access)"
                    className="w-full bg-transparent text-[11px] text-foreground placeholder-muted-foreground focus-visible:outline-none border-b border-dashed border-border pb-0.5 mb-0.5"
                  />
                  <span className="text-[10px] text-muted-foreground leading-tight block">
                    {attachment.trim() && !isValidDriveLink
                      ? <span className="text-destructive">Must be a drive.google.com link</span>
                      : 'Share the file via Google Drive and make sure link access is on'}
                  </span>
                </div>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-xl p-2.5 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="confidential-check"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="mt-0.5 rounded border-border text-warning focus:ring-warning cursor-pointer"
                />
                <label htmlFor="confidential-check" className="text-[11px] text-foreground cursor-pointer select-none leading-tight">
                  <strong className="text-warning font-bold block">Mark as Confidential</strong>
                  Routed directly to Senior HR & Founder escalation queue.
                </label>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs px-3.5 py-2.5 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#671421] hover:bg-[#360C13] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-black/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Submitting…' : 'Submit HR Ticket'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
