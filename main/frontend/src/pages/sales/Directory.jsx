import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Search, MapPin, Upload, Plus, Filter } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal, { STATUS_VALUES, PRIORITY_VALUES } from '../../components/sales/LeadProfileModal';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { salesLeadsApi } from '../../utils/api';
import { useSalesDesk } from '../../context/SalesDeskContext';
import { ColorSelect } from '../../components/TicketsQueueView';

const EMPTY_ADD_FORM = { companyName: '', contactName: '', designation: '', mobile: '', email: '', city: '', assignedTo: '' };

// Marketing Master Sheet fields (docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md) —
// mirrors the enums salesDeskController.js normalizes the import onto.
const DESIGNATION_LEVEL_VALUES = ['Decision Maker', 'Influencer', 'Other'];
const EMAIL_CAMPAIGN_VALUES = ['Not Sent', 'Sent', 'Both Done', 'Got Response', 'Bounced'];
const WHATSAPP_CAMPAIGN_VALUES = ['Not Started', 'Going On', 'Done', 'No Response'];
const LINKEDIN_CAMPAIGN_VALUES = ['Not Started', '1st Msg Sent', 'Follow-up Done'];

export default function SalesDirectory() {
  const { leads, setLeads } = useSalesDesk();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [repFilter, setRepFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [designationLevelFilter, setDesignationLevelFilter] = useState('All');
  const [emailCampaignFilter, setEmailCampaignFilter] = useState('All');
  const [whatsappCampaignFilter, setWhatsappCampaignFilter] = useState('All');
  const [linkedinCampaignFilter, setLinkedinCampaignFilter] = useState('All');
  const [hideBadContacts, setHideBadContacts] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selected, setSelected] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addSaving, setAddSaving] = useState(false);

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const reps = useMemo(
    () => [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))].sort(),
    [leads]
  );
  // Country is India unless a lead was explicitly imported/tagged Australia
  // - most leads predate that field, so they shouldn't disappear from the
  // default "All" view just for not having it set.
  const countries = useMemo(
    () => [...new Set(leads.map((l) => l.country).filter(Boolean))].sort(),
    [leads]
  );
  const cities = useMemo(() => {
    const pool = countryFilter === 'All' ? leads : leads.filter((l) => (l.country || 'India') === countryFilter);
    return [...new Set(pool.map((l) => l.city).filter(Boolean))].sort();
  }, [leads, countryFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && l.priority !== priorityFilter) return false;
      if (repFilter !== 'All' && l.assignedTo !== repFilter) return false;
      if (countryFilter !== 'All' && (l.country || 'India') !== countryFilter) return false;
      if (cityFilter !== 'All' && l.city !== cityFilter) return false;
      if (designationLevelFilter !== 'All' && l.designationLevel !== designationLevelFilter) return false;
      if (emailCampaignFilter !== 'All' && (l.emailCampaignStatus || 'Not Sent') !== emailCampaignFilter) return false;
      if (whatsappCampaignFilter !== 'All' && (l.whatsappCampaignStatus || 'Not Started') !== whatsappCampaignFilter) return false;
      if (linkedinCampaignFilter !== 'All' && (l.linkedinCampaignStatus || 'Not Started') !== linkedinCampaignFilter) return false;
      // "Bad contacts" = known-wrong email/phone, or a contact flagged as
      // having left their company - dead weight for a rep working the list,
      // but never deleted (still reachable by turning this toggle off).
      if (hideBadContacts && (l.emailVerified === 'Invalid' || l.phoneVerified === 'Wrong' || l.leftOrganisation)) return false;
      if (!q) return true;
      return (
        (l.companyName || '').toLowerCase().includes(q) ||
        (l.contactName || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q)
      );
    });
  }, [
    leads, query, statusFilter, priorityFilter, repFilter, countryFilter, cityFilter,
    designationLevelFilter, emailCampaignFilter, whatsappCampaignFilter, linkedinCampaignFilter, hideBadContacts,
  ]);

  async function submitAdd(e) {
    e.preventDefault();
    setAddSaving(true);
    try {
      const { data } = await salesLeadsApi.create(addForm);
      setLeads((rows) => [data, ...rows]);
      setAddOpen(false);
      setAddForm(EMPTY_ADD_FORM);
      toast.success('Lead added');
    } catch (e) {
      toast.error('Could not add lead', { description: e.response?.data?.error || e.message });
    } finally {
      setAddSaving(false);
    }
  }

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    salesLeadsApi
      .import(file)
      .then(({ data }) => {
        toast.success('Import complete', { description: `${data.created} new, ${data.updated} updated (${data.imported} total)` });
        return salesLeadsApi.list();
      })
      .then(({ data }) => setLeads(data))
      .catch((err) => toast.error('Import failed', { description: err.response?.data?.error || err.message }))
      .finally(() => setImporting(false));
  }

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader
          title="Sales Directory"
          subtitle={`${filtered.length} of ${leads.length} leads`}
          action={
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChosen} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 bg-muted hover:bg-accent border border-border text-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                {importing ? 'Importing…' : 'Import Leads'}
              </button>
              <button
                type="button"
                onClick={() => { setAddForm(EMPTY_ADD_FORM); setAddOpen(true); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Lead
              </button>
            </div>
          }
        />

        <Card>
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company, contact, city..."
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {countries.length > 0 && (
              <div className="w-32">
                <ColorSelect
                  value={countryFilter}
                  onChange={(v) => { setCountryFilter(v); setCityFilter('All'); }}
                  options={[{ value: 'All', label: 'All countries' }, ...countries.map((c) => ({ value: c, label: c }))]}
                />
              </div>
            )}
            <div className="w-36">
              <ColorSelect
                value={repFilter}
                onChange={setRepFilter}
                options={[{ value: 'All', label: 'All reps' }, ...reps.map((r) => ({ value: r, label: r }))]}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMoreFilters((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                showMoreFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter size={13} /> More filters
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Pill active={priorityFilter === 'All'} onClick={() => setPriorityFilter('All')}>All Priorities</Pill>
            {PRIORITY_VALUES.map((p) => (
              <Pill key={p} active={priorityFilter === p} onClick={() => setPriorityFilter(p)}>{p}</Pill>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            <Pill active={statusFilter === 'All'} onClick={() => setStatusFilter('All')}>All Statuses</Pill>
            {STATUS_VALUES.map((s) => (
              <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</Pill>
            ))}
          </div>

          {showMoreFilters && (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 mb-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <Field label="City">
                  <ColorSelect
                    value={cityFilter}
                    onChange={setCityFilter}
                    options={[{ value: 'All', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]}
                  />
                </Field>
                <Field label="Designation Level">
                  <ColorSelect
                    value={designationLevelFilter}
                    onChange={setDesignationLevelFilter}
                    options={[{ value: 'All', label: 'All levels' }, ...DESIGNATION_LEVEL_VALUES.map((v) => ({ value: v, label: v }))]}
                  />
                </Field>
                <Field label="Email Campaign">
                  <ColorSelect
                    value={emailCampaignFilter}
                    onChange={setEmailCampaignFilter}
                    options={[{ value: 'All', label: 'Any' }, ...EMAIL_CAMPAIGN_VALUES.map((v) => ({ value: v, label: v }))]}
                  />
                </Field>
                <Field label="WhatsApp Campaign">
                  <ColorSelect
                    value={whatsappCampaignFilter}
                    onChange={setWhatsappCampaignFilter}
                    options={[{ value: 'All', label: 'Any' }, ...WHATSAPP_CAMPAIGN_VALUES.map((v) => ({ value: v, label: v }))]}
                  />
                </Field>
                <Field label="LinkedIn Campaign">
                  <ColorSelect
                    value={linkedinCampaignFilter}
                    onChange={setLinkedinCampaignFilter}
                    options={[{ value: 'All', label: 'Any' }, ...LINKEDIN_CAMPAIGN_VALUES.map((v) => ({ value: v, label: v }))]}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
                <input type="checkbox" checked={hideBadContacts} onChange={(e) => setHideBadContacts(e.target.checked)} className="accent-primary" />
                Hide bad contacts (invalid email, wrong number, or left the company)
              </label>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState text="No leads match these filters." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="text-left p-4 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{l.companyName}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.contactName || 'No contact name'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge value={l.priority} />
                      <Badge value={l.status} />
                    </div>
                  </div>
                  {l.city && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                      <MapPin size={11} /> {l.city}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {l.assignedTo && <div className="text-xs text-primary">{l.assignedTo}</div>}
                    {l.dealValue > 0 && <div className="text-xs font-semibold text-foreground">₹{Number(l.dealValue).toLocaleString('en-IN')}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Lead" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={submitAdd} className="flex flex-col gap-3">
          <Field label="Company Name">
            <input required value={addForm.companyName} onChange={(e) => setAddForm((f) => ({ ...f, companyName: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Name"><input value={addForm.contactName} onChange={(e) => setAddForm((f) => ({ ...f, contactName: e.target.value }))} className={inputClass} /></Field>
            <Field label="Designation"><input value={addForm.designation} onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))} className={inputClass} /></Field>
            <Field label="Mobile"><input value={addForm.mobile} onChange={(e) => setAddForm((f) => ({ ...f, mobile: e.target.value }))} className={inputClass} /></Field>
            <Field label="Email"><input value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
            <Field label="City"><input value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} /></Field>
            <Field label="Assigned To"><input value={addForm.assignedTo} onChange={(e) => setAddForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputClass} list="sales-reps" /></Field>
            <datalist id="sales-reps">{reps.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <button type="submit" disabled={addSaving} className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60">
            {addSaving ? 'Adding…' : 'Add Lead'}
          </button>
        </form>
      </Modal>
    </SalesLayout>
  );
}
