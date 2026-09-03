import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, X, ArrowRight } from 'lucide-react';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../data/itMockData';
import { HR_TICKET_CATEGORIES, HR_PRIORITIES } from './NewHrTicketModal';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';
import { ColorSelect } from './TicketsQueueView';

// Lets an employee fix up their own ticket's content after raising it
// (category/subcategory/priority/description) - replaces the Delete action
// in the Employee Portal's ticket queue, since "I made a mistake" is far
// more often what someone actually wants than "throw this away". Shares
// one modal for both IT and HR tickets (ticket.dept picks which category
// list/priority set applies) rather than forking NewItTicketModal/
// NewHrTicketModal a second time just to pre-fill and PATCH instead of POST.
export default function EditTicketModal({ ticket, onClose, onSave }) {
  const isHr = ticket?.dept === 'HR';
  const categories = isHr ? HR_TICKET_CATEGORIES : TICKET_CATEGORIES;
  const priorities = isHr ? HR_PRIORITIES.map((p) => p.id) : TICKET_PRIORITIES;

  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticket) return;
    const cat = ticket.category && categories[ticket.category] ? ticket.category : Object.keys(categories)[0];
    setCategory(cat);
    setSubcategory(ticket.subcategory && categories[cat]?.includes(ticket.subcategory) ? ticket.subcategory : categories[cat]?.[0] || '');
    setPriority(ticket.priority || 'Medium');
    setDescription(ticket.description || '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when a different ticket is opened
  }, [ticket?.id]);

  useEscapeToClose(!!ticket && !saving, onClose);

  if (!ticket) return null;

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubcategory(categories[cat]?.[0] || '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(ticket.id, { category, subcategory, priority, description });
      toast.success('Ticket updated');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not update the ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn font-sans" {...(saving ? {} : backdropProps(onClose))}>
      <div role="dialog" aria-modal="true" aria-label="Edit Ticket" className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Pencil size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground leading-none">Edit Ticket</h3>
              <p className="text-xs text-muted-foreground mt-1">{ticket.token}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
            <ColorSelect value={category} onChange={handleCategoryChange} options={Object.keys(categories)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Subcategory</label>
            <ColorSelect value={subcategory} onChange={setSubcategory} options={categories[category] || []} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
            <ColorSelect value={priority} onChange={setPriority} options={priorities} />
          </div>

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
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs px-3.5 py-2.5 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-primary-foreground flex items-center gap-2 shadow transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
