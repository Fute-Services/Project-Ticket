import { useEffect, useMemo, useState } from 'react';
import { Search, Mail, Phone, Calendar, Landmark, Plus, Pencil, Trash2 } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Drawer, EmptyState, Modal, Field, inputClass } from '../../components/ui';
import { bankDetails } from '../../data/hrMockData';
import { employeesApi } from '../../utils/api';

const EMPTY_FORM = { name: '', department: '', designation: '', email: '', phone: '', manager: '', status: 'Active', joiningDate: '' };
const STATUS_OPTIONS = ['Active', 'On Leave', 'Inactive'];

// Real employees created through this form have no `photo` field (the
// backend only stores what's in editableFields, and "photo" here is just
// initials, not an actual image) — legacy/seeded records that do have one
// keep it, everyone else gets initials computed from their name instead.
function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Directory() {
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // null = closed, 'add' = create form, an employee id = editing that row
  const [formMode, setFormMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    employeesApi.list().then(({ data }) => setEmployees(data)).catch((e) => console.error('Failed to load employees:', e.message));
  }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormMode('add');
  }

  function openEdit(employee) {
    setForm({
      name: employee.name || '',
      department: employee.department || '',
      designation: employee.designation || '',
      email: employee.email || '',
      phone: employee.phone || '',
      manager: employee.manager || '',
      status: employee.status || 'Active',
      joiningDate: employee.joiningDate || '',
    });
    setFormError('');
    setFormMode(employee.id);
  }

  function closeForm() {
    setFormMode(null);
    setFormError('');
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'add') {
        const { data } = await employeesApi.create(form);
        setEmployees((rows) => [data, ...rows]);
      } else {
        const { data } = await employeesApi.update(formMode, form);
        setEmployees((rows) => rows.map((r) => (r.id === formMode ? { ...r, ...data } : r)));
        setSelected((cur) => (cur && cur.id === formMode ? { ...cur, ...data } : cur));
      }
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save this employee.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    if (!window.confirm(`Remove ${employee.name} from the directory? This can't be undone.`)) return;
    try {
      await employeesApi.remove(employee.id);
      setEmployees((rows) => rows.filter((r) => r.id !== employee.id));
      setSelected((cur) => (cur && cur.id === employee.id ? null : cur));
    } catch (e) {
      console.error('Failed to delete employee:', e.response?.data?.error || e.message);
    }
  }

  const DEPARTMENTS = useMemo(() => ['All', ...new Set(employees.map((e) => e.department))], [employees]);

  // Same reduce-and-count logic the old "Headcount by Department" card used
  // (pages/hr/Overview.jsx) — 'All' isn't a real department value, so it's
  // looked up separately as the full employee count rather than falling
  // through the reduce and showing 0/undefined.
  const departmentCounts = useMemo(
    () =>
      employees.reduce((acc, e) => {
        acc[e.department] = (acc[e.department] || 0) + 1;
        return acc;
      }, {}),
    [employees]
  );
  function countFor(dept) {
    return dept === 'All' ? employees.length : departmentCounts[dept] || 0;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (dept !== 'All' && e.department !== dept) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
    });
  }, [employees, query, dept]);

  const bank = selected ? bankDetails[selected.id] : null;

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Employee Directory"
          subtitle={`${filtered.length} of ${employees.length} employees`}
          action={
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Employee
            </button>
          }
        />

        <Card>
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or role..."
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {DEPARTMENTS.map((d) => (
              <Pill key={d} active={dept === d} onClick={() => setDept(d)}>{d} ({countFor(d)})</Pill>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No employees match this search." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelected(e)}
                  className="text-left p-4 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {e.photo || initialsOf(e.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.designation}</div>
                    </div>
                    <Badge value={e.status} className="ml-auto shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Mail size={11} className="text-muted-foreground" /> {e.email}</div>
                    <div className="flex items-center gap-1.5"><Phone size={11} className="text-muted-foreground" /> {e.phone}</div>
                    <div className="flex items-center gap-1.5"><Calendar size={11} className="text-muted-foreground" /> Joined {e.joiningDate}</div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border text-xs text-muted-foreground">
                    {e.department} · Reports to {e.manager}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Employee Profile">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                {selected.photo || initialsOf(selected.name)}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground truncate">{selected.name}</div>
                <div className="text-xs text-muted-foreground truncate">{selected.designation}</div>
              </div>
              <Badge value={selected.status} className="ml-auto shrink-0" />
              <button
                type="button"
                onClick={() => openEdit(selected)}
                title="Edit employee"
                aria-label="Edit employee"
                className="p-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => deleteEmployee(selected)}
                title="Delete employee"
                aria-label="Delete employee"
                className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive transition-colors cursor-pointer shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail size={13} className="text-primary" /> {selected.email}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone size={13} className="text-primary" /> {selected.phone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar size={13} className="text-primary" /> Joined {selected.joiningDate}</div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              {selected.department} · Reports to {selected.manager}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Landmark size={12} className="text-primary" /> Bank Details
              </div>
              {bank ? (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-muted border border-border text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Holder</span><span className="text-foreground font-medium">{bank.accountHolder}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="text-foreground font-medium">{bank.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account No.</span><span className="text-foreground font-medium">{bank.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IFSC</span><span className="text-foreground font-medium">{bank.ifsc}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="text-foreground font-medium">{bank.branch}</span></div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No bank details on file.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={!!formMode} onClose={closeForm} title={formMode === 'add' ? 'Add Employee' : 'Edit Employee'}>
        <form onSubmit={submitForm} className="flex flex-col gap-3">
          <Field label="Full name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <input
                required
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className={inputClass}
                placeholder="Production"
              />
            </Field>
            <Field label="Designation">
              <input
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className={inputClass}
                placeholder="3D Artist"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                placeholder="jane@futeservices.com"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
                placeholder="+91 90000 00000"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manager">
              <input
                value={form.manager}
                onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
                className={inputClass}
                placeholder="Reports to"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Joining date">
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
              className={inputClass}
            />
          </Field>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : formMode === 'add' ? 'Add Employee' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
