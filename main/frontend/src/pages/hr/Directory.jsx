import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Mail, Phone, Calendar, Landmark, Plus, Pencil, Trash2, Upload, FileText } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, EmptyState, Modal, Field, inputClass } from '../../components/ui';
import { bankDetails } from '../../data/hrMockData';
import { employeesApi } from '../../utils/api';
import { useHrDesk } from '../../context/HrDeskContext';

const EMPTY_FORM = {
  name: '', department: '', designation: '', email: '', phone: '', manager: '', status: 'Active', joiningDate: '',
  employmentType: 'Full time', probationCompletionDate: '',
  empCode: '', biometricVpnNumber: '',
  accountNumber: '', salary: '',
  emergencyContact: '', emergencyContactRelation: '', personalEmail: '', dob: '', bloodGroup: '',
  permanentAddress: '', presentAddress: '',
  aadharNumber: '', panDetails: '', voterId: '',
  driveLink: '', bgVerification: 'Pending', leaveEntitlement: '24',
};
const DEFAULT_LEAVE_ENTITLEMENT = 24;
const STATUS_OPTIONS = ['Active', 'On Leave', 'Inactive'];
const EMPLOYMENT_TYPE_OPTIONS = ['Full time'];
const BG_VERIFICATION_OPTIONS = ['Pending', 'Verified', 'Not Verified'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Document Template module — full names shown to HR (not the OL/NDA/LP/COC
// shorthand from the original notes), each paired with the Storage URL +
// filename fields the upload endpoint writes onto the employee record.
const DOCUMENT_TYPES = [
  { key: 'olSigned', label: 'Offer Letter (Signed)', urlField: 'olSignedUrl', fileNameField: 'olSignedFileName' },
  { key: 'nda', label: 'Non-Disclosure Agreement (NDA)', urlField: 'ndaUrl', fileNameField: 'ndaFileName' },
  { key: 'leavePolicy', label: 'Leave Policy (Acknowledged)', urlField: 'leavePolicyUrl', fileNameField: 'leavePolicyFileName' },
  { key: 'coc', label: 'Code of Conduct (COC)', urlField: 'cocUrl', fileNameField: 'cocFileName' },
  { key: 'oldAppointmentLetter', label: 'Old Appointment Letter', urlField: 'oldAppointmentLetterUrl', fileNameField: 'oldAppointmentLetterFileName' },
  { key: 'relievingLetter', label: 'Relieving Letter', urlField: 'relievingLetterUrl', fileNameField: 'relievingLetterFileName' },
  { key: 'aadharCard', label: 'Aadhar Card', urlField: 'aadharCardUrl', fileNameField: 'aadharCardFileName' },
  { key: 'panCard', label: 'PAN Card', urlField: 'panCardUrl', fileNameField: 'panCardFileName' },
  { key: 'voterIdCard', label: 'Voter ID', urlField: 'voterIdCardUrl', fileNameField: 'voterIdCardFileName' },
  { key: 'driveLinkDoc', label: 'Drive Link Document', urlField: 'driveLinkDocUrl', fileNameField: 'driveLinkDocFileName' },
];
const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.doc,.docx';

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
  const { employees, setEmployees, attendanceRecords } = useHrDesk();
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // null = closed, 'add' = create form, an employee id = editing that row
  const [formMode, setFormMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  // The doc.key currently uploading, so only that row's button shows
  // "Uploading…" instead of the whole Documents list locking up.
  const [uploadingDoc, setUploadingDoc] = useState(null);

  async function uploadDocument(doc, file) {
    setUploadingDoc(doc.key);
    try {
      const { data } = await employeesApi.uploadDocument(selected.id, doc.key, file);
      setEmployees((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...data } : r)));
      setSelected((cur) => (cur && cur.id === selected.id ? { ...cur, ...data } : cur));
      toast.success(`${doc.label} uploaded`);
    } catch (e) {
      toast.error(`Could not upload ${doc.label}`, { description: e.response?.data?.error || e.message });
    } finally {
      setUploadingDoc(null);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormMode('add');
  }

  function openEdit(employee) {
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, employee[key] ?? EMPTY_FORM[key]])),
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

  // Dropdown-driven per the requirements doc, sourced from whatever
  // departments/designations already exist in real records — no hardcoded
  // list to keep in sync as the org's actual departments/designations grow.
  const DEPARTMENT_OPTIONS = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees]
  );
  const DESIGNATION_OPTIONS = useMemo(
    () => [...new Set(employees.map((e) => e.designation).filter(Boolean))].sort(),
    [employees]
  );

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

  // Leave taken is counted straight from attendance rows this employee
  // marked as 'Leave' via their own Check-in/Check-out widget (see
  // CheckInWidget.jsx + checkIn() in hrDeskController.js) — that's the one
  // and only place a day becomes 'Leave', so no separate leave-request
  // approval flow needs to feed this number.
  const leaveStats = useMemo(() => {
    if (!selected) return null;
    const taken = attendanceRecords.filter((a) => a.employeeId === selected.id && a.status === 'Leave').length;
    const entitlement = Number(selected.leaveEntitlement) || DEFAULT_LEAVE_ENTITLEMENT;
    return { taken, entitlement, remaining: Math.max(0, entitlement - taken) };
  }, [attendanceRecords, selected]);

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 w-full">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Employee Profile"
        className="max-w-5xl max-h-[95vh] overflow-y-auto"
      >
        {selected && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary shrink-0">
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pb-2 border-b border-border">
              <span className="flex items-center gap-1.5"><Mail size={12} className="text-primary" /> {selected.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary" /> {selected.phone}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> Joined {selected.joiningDate}</span>
              <span>{selected.department} · Reports to {selected.manager} · {selected.employmentType || 'Full time'}</span>
              <span className="ml-auto font-semibold text-foreground">
                Leave: <span className="text-primary">{leaveStats.taken}</span> taken · <span className="text-primary">{leaveStats.remaining}</span> left of {leaveStats.entitlement}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Employee Details</div>
                  <div className="rounded-xl bg-muted border border-border divide-y divide-border/60 overflow-hidden text-xs">
                    {[
                      ['Emp Code', selected.empCode],
                      ['DOJ', selected.joiningDate],
                      ['Probation Completion', selected.probationCompletionDate],
                      ['Biometric / VPN No.', selected.biometricVpnNumber],
                      ['DOB', selected.dob],
                      ['Blood Group', selected.bloodGroup],
                      ['Personal Email', selected.personalEmail],
                      ['Emergency Contact', [selected.emergencyContact, selected.emergencyContactRelation && `(${selected.emergencyContactRelation})`].filter(Boolean).join(' ')],
                      ['Aadhar No.', selected.aadharNumber],
                      ['PAN Details', selected.panDetails],
                      ['Voter ID', selected.voterId],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 px-3 py-1.5">
                        <span className="text-muted-foreground shrink-0">{label}</span>
                        <span className="text-foreground font-medium text-right truncate">{value || '—'}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Drive Link</span>
                      {selected.driveLink ? (
                        <a href={selected.driveLink} target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline truncate">Open folder</a>
                      ) : (
                        <span className="text-foreground font-medium">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Permanent Address</span>
                      <span className="text-foreground font-medium text-right truncate">{selected.permanentAddress || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Present Address</span>
                      <span className="text-foreground font-medium text-right truncate">{selected.presentAddress || '—'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Landmark size={12} className="text-primary" /> Bank Details
                  </div>
                  {bank ? (
                    <div className="rounded-xl bg-muted border border-border divide-y divide-border/60 overflow-hidden text-xs">
                      {[
                        ['Account Holder', bank.accountHolder],
                        ['Bank', bank.bankName],
                        ['Account No.', bank.accountNumber],
                        ['IFSC', bank.ifsc],
                        ['Branch', bank.branch],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-3 px-3 py-1.5">
                          <span className="text-muted-foreground shrink-0">{label}</span>
                          <span className="text-foreground font-medium text-right truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No bank details on file.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Documents</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {DOCUMENT_TYPES.map((doc) => {
                    const url = selected[doc.urlField];
                    const fileName = selected[doc.fileNameField];
                    const busy = uploadingDoc === doc.key;
                    return (
                      <div key={doc.key} className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-muted border border-border">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <FileText size={12} className={url ? 'text-primary shrink-0' : 'text-muted-foreground shrink-0'} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{doc.label}</div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate block">
                                {fileName || 'View file'}
                              </a>
                            ) : (
                              <div className="text-[10px] text-muted-foreground">Not uploaded</div>
                            )}
                          </div>
                        </div>
                        <label
                          title={busy ? 'Uploading…' : url ? 'Replace file' : 'Upload file'}
                          className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md border cursor-pointer transition-colors ${
                            busy
                              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                              : 'bg-background hover:bg-accent text-foreground border-border'
                          }`}
                        >
                          <Upload size={11} />
                          <input
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="hidden"
                            disabled={busy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) uploadDocument(doc, file);
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-muted border border-border">
                    <span className="text-xs font-medium text-foreground">BG Verification</span>
                    <span className="text-[10px] text-muted-foreground">{selected.bgVerification || 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!formMode}
        onClose={closeForm}
        title={formMode === 'add' ? 'Add Employee' : 'Edit Employee'}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
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
                list="department-options"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className={inputClass}
                placeholder="Production"
              />
              <datalist id="department-options">
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field label="Designation">
              <input
                list="designation-options"
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className={inputClass}
                placeholder="3D Artist"
              />
              <datalist id="designation-options">
                {DESIGNATION_OPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Official Mail ID">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                placeholder="jane@futeservices.com"
              />
            </Field>
            <Field label="Contact No.">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="DOJ (Joining date)">
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="Employment Type">
              <select
                value={form.employmentType}
                onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                className={inputClass}
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Completion of probation period">
            <input
              type="date"
              value={form.probationCompletionDate}
              onChange={(e) => setForm((f) => ({ ...f, probationCompletionDate: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-muted-foreground -mt-1">
            Offer Letter, NDA, Leave Policy, COC and other document uploads are done from the employee's profile after saving.
          </p>

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2 mb-1">Employment &amp; Access</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emp Code">
              <input value={form.empCode} onChange={(e) => setForm((f) => ({ ...f, empCode: e.target.value }))} className={inputClass} placeholder="e.g. 10352" />
            </Field>
            <Field label="Biometric / VPN Number">
              <input value={form.biometricVpnNumber} onChange={(e) => setForm((f) => ({ ...f, biometricVpnNumber: e.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2 mb-1">Banking &amp; Salary</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="A/C No.">
              <input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Salary (in Rs)">
              <input type="number" min="0" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2 mb-1">Personal &amp; Emergency Contact</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emergency Contact No.">
              <input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Relation">
              <input value={form.emergencyContactRelation} onChange={(e) => setForm((f) => ({ ...f, emergencyContactRelation: e.target.value }))} className={inputClass} placeholder="e.g. Father" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Personal Email ID">
              <input type="email" value={form.personalEmail} onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="DOB">
              <input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Blood Group">
            <select value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} className={inputClass}>
              <option value="">Select</option>
              {BLOOD_GROUP_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Permanent Address">
            <input value={form.permanentAddress} onChange={(e) => setForm((f) => ({ ...f, permanentAddress: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Present Address">
            <input value={form.presentAddress} onChange={(e) => setForm((f) => ({ ...f, presentAddress: e.target.value }))} className={inputClass} />
          </Field>

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2 mb-1">Government ID</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aadhar Card No.">
              <input value={form.aadharNumber} onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="PAN Card Details">
              <input value={form.panDetails} onChange={(e) => setForm((f) => ({ ...f, panDetails: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Voter ID">
            <input value={form.voterId} onChange={(e) => setForm((f) => ({ ...f, voterId: e.target.value }))} className={inputClass} />
          </Field>

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2 mb-1">Other</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Drive Link">
              <input value={form.driveLink} onChange={(e) => setForm((f) => ({ ...f, driveLink: e.target.value }))} className={inputClass} placeholder="https://drive.google.com/..." />
            </Field>
            <Field label="BG Verification">
              <select value={form.bgVerification} onChange={(e) => setForm((f) => ({ ...f, bgVerification: e.target.value }))} className={inputClass}>
                {BG_VERIFICATION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Annual Leave Entitlement (days)">
            <input
              type="number"
              min="0"
              value={form.leaveEntitlement}
              onChange={(e) => setForm((f) => ({ ...f, leaveEntitlement: e.target.value }))}
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
