import { useState, useEffect } from 'react';
import { X, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../data/itMockData';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';
import { useAuth } from '../context/AuthContext';

export default function NewItTicketModal({ isOpen, onClose, onSubmitSuccess, defaultDepartment }) {
  const { user } = useAuth();
  const [category, setCategory] = useState('Laptop / Desktop / Server');
  const [subcategory, setSubcategory] = useState(TICKET_CATEGORIES['Laptop / Desktop / Server'][0]);
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState(defaultDepartment || '');
  const [employeeId, setEmployeeId] = useState(user?.employeeId || user?.employee_id || '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.employeeId || user?.employee_id) {
      setEmployeeId(user.employeeId || user.employee_id);
    }
  }, [user]);

  // The field starts blank until the signed-in user's department arrives
  // (it's fetched async on login) — backfill it once, without clobbering
  // anything the person may have already typed over the default.
  const [departmentTouched, setDepartmentTouched] = useState(false);
  useEffect(() => {
    if (!departmentTouched && defaultDepartment) setDepartment(defaultDepartment);
  }, [defaultDepartment, departmentTouched]);

  // Escape must not yank the modal away mid-submit — the success panel is the
  // only confirmation the user gets that the ticket was created.
  useEscapeToClose(isOpen && !submitted, onClose);

  if (!isOpen) return null;

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubcategory(TICKET_CATEGORIES[cat][0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const userRole = user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee');
    setTimeout(() => {
      if (onSubmitSuccess) {
        onSubmitSuccess({
          category,
          subcategory,
          priority,
          description,
          role: userRole,
          department: userRole,
          employeeId: employeeId || user?.employeeId || user?.employee_id || '',
          status: 'Open',
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
        aria-label="Raise IT Support Ticket"
        className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground leading-none">Raise IT Support Ticket</h3>
              <p className="text-xs text-muted-foreground mt-1">Submit a new issue or service request</p>
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
            <h4 className="text-lg font-bold text-foreground mb-1">Ticket Created Successfully!</h4>
            <p className="text-xs text-muted-foreground">
              An IT Helpdesk Engineer has been assigned to your issue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Category Select */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Subcategory</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TICKET_CATEGORIES[category].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee ID, Priority & Department */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Employee ID</label>
                <input
                  type="text"
                  value={user?.employee_id || user?.employeeId || employeeId || ''}
                  readOnly
                  disabled
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-primary font-bold focus:outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Role</label>
                <input
                  type="text"
                  value={user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee')}
                  readOnly
                  disabled
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground font-bold focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Issue Description <span className="text-primary">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
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
