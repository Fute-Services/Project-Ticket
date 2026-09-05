import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Mail, Phone, Calendar, Landmark, Plus, Pencil, Trash2, Upload, FileText, Receipt } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, EmptyState, Modal, Field, inputClass } from '../../components/ui';
import { bankDetails } from '../../data/hrMockData';
import { employeesApi, performanceApi, leaveEntriesApi } from '../../utils/api';
import { useHrDesk } from '../../context/HrDeskContext';
import { useApprovals } from '../../context/ApprovalContext';
import { ColorSelect } from '../../components/TicketsQueueView';
import { escapeHtml } from '../../utils/escapeHtml';

const EMPTY_FORM = {
  name: '', department: '', designation: '', email: '', phone: '', manager: '', status: 'Active', joiningDate: '',
  employmentType: 'Full time', probationCompletionDate: '',
  empCode: '', biometricVpnNumber: '', uan: '',
  accountNumber: '', salary: '',
  emergencyContact: '', emergencyContactRelation: '', personalEmail: '', dob: '', bloodGroup: '',
  permanentAddress: '', presentAddress: '',
  aadharNumber: '', panDetails: '', voterId: '',
  driveLink: '', bgVerification: 'Pending', leaveEntitlement: '24',
};
const DEFAULT_LEAVE_ENTITLEMENT = 24;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_NAMES = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
const PERFORMANCE_CATEGORIES = [
  { key: 'walkthrough', label: '3D Walkthrough Sequence' },
  { key: 'floorPlan', label: '3D Floor Plan' },
  { key: 'masterplan', label: 'Masterplan' },
  { key: 'views3d', label: '3D Views' },
];
const STATUS_OPTIONS = ['Active', 'On Leave', 'Inactive'];
const EMPLOYMENT_TYPE_OPTIONS = ['Full time'];
const BG_VERIFICATION_OPTIONS = ['Pending', 'Verified', 'Not Verified'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Document Template module - full names shown to HR (not the OL/NDA/LP/COC
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
  { key: 'other1', label: 'Other Document 1', urlField: 'other1Url', fileNameField: 'other1FileName' },
  { key: 'other2', label: 'Other Document 2', urlField: 'other2Url', fileNameField: 'other2FileName' },
  { key: 'other3', label: 'Other Document 3', urlField: 'other3Url', fileNameField: 'other3FileName' },
];
const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.doc,.docx';

// Payslip - Indian numbering (Lakh/Crore), matching how Zoho's free payslip
// generator (zoho.com/in/payroll/free-payslip-generator) renders "amount in
// words" on the template this is deliberately matching, not integrating with.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigitWords(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}
function threeDigitWords(n) {
  if (n < 100) return twoDigitWords(n);
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigitWords(n % 100) : '');
}
function numberToWordsINR(amount) {
  const n = Math.round(amount);
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (crore) parts.push(threeDigitWords(crore) + ' Crore');
  if (lakh) parts.push(threeDigitWords(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigitWords(thousand) + ' Thousand');
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(' ') + ' Rupees Only';
}

// Generate Payslip - HR now edits an Employee Pay Summary + Income Details
// form (pre-filled from the employee record/attendance, matching Zoho's free
// payslip generator's edit step - see docs/HR-Portal-Build-Plan.pdf, §07: that
// tool has no account/API, it's a template to match, not a service to call)
// before the final payslip document is generated from whatever HR edited.
function defaultPayslipForm(employee, attendanceRecords) {
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const monthRows = attendanceRecords.filter((a) => a.employeeId === employee.id && a.date?.startsWith(monthPrefix));
  const paidDays = monthRows.filter((a) => a.checkIn && a.checkIn !== '-').length;
  const lopDays = monthRows.filter((a) => a.status === 'Leave').length;
  const basic = Number(employee.salary) || 0;

  return {
    companyName: 'Fute Services',
    companyAddress: '',
    cityPincode: '',
    country: 'India',
    employeeName: employee.name || '',
    employeeId: employee.empCode || '',
    payPeriod: monthPrefix,
    paidDays: String(paidDays),
    lopDays: String(lopDays),
    payDate: now.toISOString().slice(0, 10),
    earnings: [
      { id: 'basic', label: 'Basic', amount: String(basic) },
      { id: 'hra', label: 'House Rent Allowance', amount: '0' },
    ],
    deductions: [
      { id: 'incomeTax', label: 'Income Tax', amount: '0' },
      { id: 'pf', label: 'Provident Fund', amount: '0' },
    ],
  };
}

function payslipTotals(payslipForm) {
  const sum = (rows) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const gross = sum(payslipForm.earnings);
  const totalDeductions = sum(payslipForm.deductions);
  return { gross, totalDeductions, net: Math.max(0, gross - totalDeductions) };
}

function printPayslip(payslipForm) {
  const { gross, totalDeductions, net } = payslipTotals(payslipForm);
  const [year, month] = payslipForm.payPeriod.split('-').map(Number);
  const monthLabel = new Date(year, (month || 1) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const row = (label, value) =>
    `<tr><td style="padding:5px 10px;color:#555;">${escapeHtml(label)}</td><td style="padding:5px 10px;text-align:right;font-weight:600;">₹${(Number(value) || 0).toLocaleString('en-IN')}</td></tr>`;

  const companyName = escapeHtml(payslipForm.companyName) || 'Company';
  const employeeName = escapeHtml(payslipForm.employeeName);
  const employeeId = escapeHtml(payslipForm.employeeId) || '-';
  const companyAddress = escapeHtml(payslipForm.companyAddress);
  const cityPincode = escapeHtml(payslipForm.cityPincode);
  const country = escapeHtml(payslipForm.country);
  const paidDays = escapeHtml(payslipForm.paidDays);
  const lopDays = escapeHtml(payslipForm.lopDays);
  const payDate = escapeHtml(payslipForm.payDate);

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head><title>Payslip - ${employeeName} - ${monthLabel}</title></head>
      <body style="font-family:sans-serif;padding:28px;color:#1a1a1a;">
        <div style="max-width:640px;margin:auto;border:1px solid #ddd;border-radius:10px;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
            <div>
              <img src="${window.location.origin}/logo.png" alt="${companyName}" style="height:36px;margin-bottom:8px;display:block;" />
              <h2 style="margin:0 0 2px;">${companyName}</h2>
              ${companyAddress ? `<p style="margin:0;color:#777;font-size:12px;">${companyAddress}</p>` : ''}
              ${cityPincode ? `<p style="margin:0;color:#777;font-size:12px;">${cityPincode}</p>` : ''}
              ${country ? `<p style="margin:0;color:#777;font-size:12px;">${country}</p>` : ''}
            </div>
            <div style="text-align:right;">
              <p style="margin:0;color:#777;font-size:12px;">Payslip For the Month</p>
              <p style="margin:0;font-weight:700;">${monthLabel}</p>
            </div>
          </div>
          <table style="width:100%;font-size:13px;margin-bottom:14px;">
            <tr><td style="padding:3px 0;color:#777;">Employee Name</td><td style="text-align:right;font-weight:600;">${employeeName}</td></tr>
            <tr><td style="padding:3px 0;color:#777;">Employee ID</td><td style="text-align:right;">${employeeId}</td></tr>
            <tr><td style="padding:3px 0;color:#777;">Pay Period</td><td style="text-align:right;">${monthLabel}</td></tr>
            <tr><td style="padding:3px 0;color:#777;">Paid Days</td><td style="text-align:right;">${paidDays}</td></tr>
            <tr><td style="padding:3px 0;color:#777;">Loss of Pay Days</td><td style="text-align:right;">${lopDays}</td></tr>
            <tr><td style="padding:3px 0;color:#777;">Pay Date</td><td style="text-align:right;">${payDate}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;font-size:13px;border-top:1px solid #eee;">
            <tr style="background:#f6f6f6;"><td style="padding:6px 10px;font-weight:700;">Earnings</td><td></td></tr>
            ${payslipForm.earnings.map((r) => row(r.label, r.amount)).join('')}
            <tr style="background:#f6f6f6;"><td style="padding:6px 10px;font-weight:700;">Deductions</td><td></td></tr>
            ${payslipForm.deductions.length ? payslipForm.deductions.map((r) => row(r.label, r.amount)).join('') : '<tr><td style="padding:5px 10px;color:#999;">None</td><td></td></tr>'}
          </table>
          <table style="width:100%;font-size:13px;margin-top:10px;border-top:2px solid #333;">
            <tr><td style="padding:6px 10px;font-weight:700;">Gross Earnings</td><td style="text-align:right;font-weight:700;">₹${gross.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:6px 10px;font-weight:700;">Total Deductions</td><td style="text-align:right;font-weight:700;">₹${totalDeductions.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:8px 10px;font-weight:800;font-size:15px;">Net Payable</td><td style="text-align:right;font-weight:800;font-size:15px;">₹${net.toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="margin-top:14px;font-size:12px;color:#777;">Amount in words: ${escapeHtml(numberToWordsINR(net))}</p>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  // win.print() used to fire immediately after document.write, before the
  // logo <img> had actually finished loading over the network - the print
  // preview would render with it missing/blank. win.onload only fires once
  // every resource the document references (the image included) is done.
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// Real employees created through this form have no `photo` field (the
// backend only stores what's in editableFields, and "photo" here is just
// initials, not an actual image) - legacy/seeded records that do have one
// keep it, everyone else gets initials computed from their name instead.
function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Directory() {
  const { employees, setEmployees, attendanceRecords, performanceEntries, setPerformanceEntries, leaveEntries, setLeaveEntries, extraHours } = useHrDesk();
  const { approvals, decide: decideApprovalAction } = useApprovals();
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
  const [leavePeriod, setLeavePeriod] = useState('Monthly');
  const [leaveMonth, setLeaveMonth] = useState(() => new Date().getMonth());
  const [leaveQuarter, setLeaveQuarter] = useState(() => Math.floor(new Date().getMonth() / 3));
  const [leaveTakenInput, setLeaveTakenInput] = useState('0');
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [payslipForm, setPayslipForm] = useState(null);
  const [perfCategory, setPerfCategory] = useState(PERFORMANCE_CATEGORIES[0].key);
  const [perfPeriod, setPerfPeriod] = useState('Monthly');
  const [perfMonth, setPerfMonth] = useState(() => new Date().getMonth());
  const [perfQuarter, setPerfQuarter] = useState(() => Math.floor(new Date().getMonth() / 3));
  const [perfForm, setPerfForm] = useState({ target: 0, delivered: 0 });
  const [perfSaving, setPerfSaving] = useState(false);

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
  // departments/designations already exist in real records - no hardcoded
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
  // (pages/hr/Overview.jsx) - 'All' isn't a real department value, so it's
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

  // Document approval status - the most recent 'document' approval for this
  // employee+docType (ApprovalContext already loads a shared, paginated
  // feed; this just filters what's already in memory, no extra fetch).
  function approvalFor(docKey) {
    if (!selected) return null;
    return approvals
      .filter((a) => a.category === 'document' && a.employeeId === selected.id && a.docType === docKey)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  function decideDocument(approvalId, status) {
    decideApprovalAction(approvalId, status).catch((e) =>
      toast.error('Could not update approval', { description: e.response?.data?.error || e.message })
    );
  }

  // "Taken" is stored one row per (employeeId, periodKey) in leave_entries -
  // same shape/pattern as performance_entries below - so HR can set a
  // different taken count per month/quarter. Total is always the employee's
  // leaveEntitlement; Remaining is entitlement minus the sum of taken across
  // every period on file (not just whichever one the dropdown is showing).
  const leaveYear = new Date().getFullYear();
  const leavePeriodKey =
    leavePeriod === 'Monthly' ? `${leaveYear}-${String(leaveMonth + 1).padStart(2, '0')}` : `${leaveYear}-Q${leaveQuarter + 1}`;
  const leaveEntry = selected
    ? leaveEntries.find((l) => l.employeeId === selected.id && l.periodKey === leavePeriodKey)
    : null;

  const leaveStats = useMemo(() => {
    if (!selected) return null;
    const entitlement = Number(selected.leaveEntitlement) || DEFAULT_LEAVE_ENTITLEMENT;
    const takenAllTime = leaveEntries
      .filter((l) => l.employeeId === selected.id)
      .reduce((s, l) => s + (Number(l.taken) || 0), 0);
    return { entitlement, remaining: Math.max(0, entitlement - takenAllTime) };
  }, [selected, leaveEntries]);

  // Re-sync the editable "Taken" input whenever the employee, period type,
  // or the specific month/quarter changes - pulls the existing entry for
  // that exact period if one exists, otherwise resets to 0.
  useEffect(() => {
    setLeaveTakenInput(String(leaveEntry?.taken ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leaveEntry is
    // re-derived from leaveEntries/selected/leavePeriodKey every render;
    // keying off those avoids re-running this on every keystroke below.
  }, [selected?.id, leavePeriodKey, leaveEntries]);

  function openPayslip(employee) {
    setPayslipForm(defaultPayslipForm(employee, attendanceRecords));
  }
  function closePayslip() {
    setPayslipForm(null);
  }
  function updatePayslipField(key, value) {
    setPayslipForm((f) => ({ ...f, [key]: value }));
  }
  function updateEarning(id, field, value) {
    setPayslipForm((f) => ({ ...f, earnings: f.earnings.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
  }
  function addEarning() {
    setPayslipForm((f) => ({ ...f, earnings: [...f.earnings, { id: `e${Date.now()}`, label: '', amount: '0' }] }));
  }
  function removeEarning(id) {
    setPayslipForm((f) => ({ ...f, earnings: f.earnings.filter((r) => r.id !== id) }));
  }
  function updateDeduction(id, field, value) {
    setPayslipForm((f) => ({ ...f, deductions: f.deductions.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
  }
  function addDeduction() {
    setPayslipForm((f) => ({ ...f, deductions: [...f.deductions, { id: `d${Date.now()}`, label: '', amount: '0' }] }));
  }
  function removeDeduction(id) {
    setPayslipForm((f) => ({ ...f, deductions: f.deductions.filter((r) => r.id !== id) }));
  }

  async function saveLeaveTaken() {
    if (!selected) return;
    setLeaveSaving(true);
    const payload = {
      employeeId: selected.id,
      period: leavePeriod,
      periodKey: leavePeriodKey,
      taken: Number(leaveTakenInput) || 0,
    };
    try {
      if (leaveEntry) {
        const { data } = await leaveEntriesApi.update(leaveEntry.id, payload);
        setLeaveEntries((rows) => rows.map((r) => (r.id === leaveEntry.id ? { ...r, ...data } : r)));
      } else {
        const { data } = await leaveEntriesApi.create(payload);
        setLeaveEntries((rows) => [...rows, data]);
      }
      toast.success('Leave taken updated');
    } catch (e) {
      toast.error('Could not update leave taken', { description: e.response?.data?.error || e.message });
    } finally {
      setLeaveSaving(false);
    }
  }

  // Performance is manual entry (decided: not derived from the Production
  // render-job tracker) - one performance_entries doc per (employeeId,
  // periodKey, category), so Walkthrough/Floor Plan/Masterplan/3D Views each
  // carry their own independent Target/Delivered for the same period.
  // "YYYY-MM" for Monthly, "YYYY-Q<n>" for Quarterly.
  const perfYear = new Date().getFullYear();
  const perfPeriodKey =
    perfPeriod === 'Monthly' ? `${perfYear}-${String(perfMonth + 1).padStart(2, '0')}` : `${perfYear}-Q${perfQuarter + 1}`;
  const perfEntry = selected
    ? performanceEntries.find(
        (p) => p.employeeId === selected.id && p.periodKey === perfPeriodKey && p.category === perfCategory
      )
    : null;

  // Re-sync the editable form whenever the employee, category, period type,
  // or the specific month/quarter changes - pulls the existing entry for
  // that exact (category, period) if one exists, otherwise resets to zeros
  // rather than leaving the previous selection's numbers on screen.
  useEffect(() => {
    setPerfForm({
      target: perfEntry?.target ?? 0,
      delivered: perfEntry?.delivered ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- perfEntry is
    // re-derived from performanceEntries/selected/perfCategory/perfPeriodKey
    // every render; keying off those (+ performanceEntries) avoids
    // re-running this on every keystroke below.
  }, [selected?.id, perfCategory, perfPeriodKey, performanceEntries]);

  async function savePerformance() {
    if (!selected) return;
    setPerfSaving(true);
    const payload = {
      employeeId: selected.id,
      period: perfPeriod,
      periodKey: perfPeriodKey,
      category: perfCategory,
      target: Number(perfForm.target) || 0,
      delivered: Number(perfForm.delivered) || 0,
    };
    try {
      if (perfEntry) {
        const { data } = await performanceApi.update(perfEntry.id, payload);
        setPerformanceEntries((rows) => rows.map((r) => (r.id === perfEntry.id ? { ...r, ...data } : r)));
      } else {
        const { data } = await performanceApi.create(payload);
        setPerformanceEntries((rows) => [...rows, data]);
      }
      toast.success('Performance saved');
    } catch (e) {
      toast.error('Could not save performance', { description: e.response?.data?.error || e.message });
    } finally {
      setPerfSaving(false);
    }
  }

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
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="mb-5 max-w-xs">
            <ColorSelect
              value={dept}
              onChange={setDept}
              ariaLabel="Filter by department"
              options={DEPARTMENTS.map((d) => ({ value: d, label: `${d} (${countFor(d)})` }))}
            />
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
              <button
                type="button"
                onClick={() => openPayslip(selected)}
                title="Generate payslip"
                aria-label="Generate payslip"
                className="p-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <Receipt size={13} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pb-2 border-b border-border">
              <span className="flex items-center gap-1.5"><Mail size={12} className="text-primary" /> {selected.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary" /> {selected.phone}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> Joined {selected.joiningDate}</span>
              <span>{selected.department} · Reports to {selected.manager} · {selected.employmentType || 'Full time'}</span>
              <span className="ml-auto font-semibold text-foreground">
                Extra Hours: {extraHours.filter((e) => e.employeeId === selected.id && e.status === 'approved').reduce((sum, e) => sum + (e.hours || 0), 0)}h approved
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
                        <span className="text-foreground font-medium text-right truncate">{value || '-'}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Drive Link</span>
                      {/^https?:\/\//i.test(selected.driveLink || '') ? (
                        <a href={selected.driveLink} target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline truncate">Open folder</a>
                      ) : (
                        <span className="text-foreground font-medium truncate">{selected.driveLink || '-'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Permanent Address</span>
                      <span className="text-foreground font-medium text-right truncate">{selected.permanentAddress || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">Present Address</span>
                      <span className="text-foreground font-medium text-right truncate">{selected.presentAddress || '-'}</span>
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

              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Documents</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {DOCUMENT_TYPES.map((doc) => {
                    const url = selected[doc.urlField];
                    const fileName = selected[doc.fileNameField];
                    const busy = uploadingDoc === doc.key;
                    const approval = approvalFor(doc.key);
                    const pending = approval?.status === 'pending_founder';
                    return (
                      <div key={doc.key} className="flex flex-col gap-1 p-2 rounded-lg bg-muted border border-border">
                        <div className="flex items-center justify-between gap-1.5">
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
                        {approval && (
                          <div className="flex items-center justify-between gap-1.5 pl-[18px]">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                approval.status === 'approved'
                                  ? 'bg-primary/10 text-primary'
                                  : approval.status === 'rejected'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {approval.status === 'pending_founder' ? 'Pending sign-off' : approval.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                            {pending && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => decideDocument(approval.id, 'approved')}
                                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => decideDocument(approval.id, 'rejected')}
                                  className="text-[10px] font-semibold text-destructive hover:underline cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                    <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-muted border border-border">
                      <span className="text-xs font-medium text-foreground">BG Verification</span>
                      <span className="text-[10px] text-muted-foreground">{selected.bgVerification || 'Pending'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">Leave</div>
                    <div className="flex gap-1.5">
                      <select
                        value={leavePeriod}
                        onChange={(e) => setLeavePeriod(e.target.value)}
                        className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                      </select>
                      {leavePeriod === 'Monthly' ? (
                        <select
                          value={leaveMonth}
                          onChange={(e) => setLeaveMonth(Number(e.target.value))}
                          className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                        >
                          {MONTH_NAMES.map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={leaveQuarter}
                          onChange={(e) => setLeaveQuarter(Number(e.target.value))}
                          className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                        >
                          {QUARTER_NAMES.map((q, i) => (
                            <option key={q} value={i}>{q}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <div className="text-base font-bold text-foreground">{leaveStats.entitlement}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                    </div>
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={leaveTakenInput}
                        onChange={(e) => setLeaveTakenInput(e.target.value)}
                        className="w-full bg-background border border-border rounded-md text-center py-0.5 text-sm font-bold text-primary"
                      />
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                        Taken ({leavePeriod === 'Monthly' ? MONTH_NAMES[leaveMonth] : `Q${leaveQuarter + 1}`})
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <div className="text-base font-bold text-foreground">{leaveStats.remaining}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveLeaveTaken}
                    disabled={leaveSaving}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {leaveSaving ? 'Saving…' : `Save ${leavePeriod === 'Monthly' ? MONTH_NAMES[leaveMonth] : `Q${leaveQuarter + 1}`} leave taken`}
                  </button>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Performance</div>
                  <div className="flex gap-1.5 mb-1.5">
                    <select
                      value={perfCategory}
                      onChange={(e) => setPerfCategory(e.target.value)}
                      className="flex-1 min-w-0 bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                    >
                      {PERFORMANCE_CATEGORIES.map((cat) => (
                        <option key={cat.key} value={cat.key}>{cat.label}</option>
                      ))}
                    </select>
                    <select
                      value={perfPeriod}
                      onChange={(e) => setPerfPeriod(e.target.value)}
                      className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                    {perfPeriod === 'Monthly' ? (
                      <select
                        value={perfMonth}
                        onChange={(e) => setPerfMonth(Number(e.target.value))}
                        className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                      >
                        {MONTH_NAMES.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={perfQuarter}
                        onChange={(e) => setPerfQuarter(Number(e.target.value))}
                        className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
                      >
                        {QUARTER_NAMES.map((q, i) => (
                          <option key={q} value={i}>{q}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={perfForm.target}
                        onChange={(e) => setPerfForm((f) => ({ ...f, target: e.target.value }))}
                        className="w-full bg-background border border-border rounded-md text-center py-0.5 text-sm font-bold text-foreground"
                      />
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Total</div>
                    </div>
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={perfForm.delivered}
                        onChange={(e) => setPerfForm((f) => ({ ...f, delivered: e.target.value }))}
                        className="w-full bg-background border border-border rounded-md text-center py-0.5 text-sm font-bold text-foreground"
                      />
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Delivered</div>
                    </div>
                    <div className="rounded-xl bg-muted border border-border p-2 text-center">
                      <div className="text-base font-bold text-primary">
                        {Math.max(0, (Number(perfForm.target) || 0) - (Number(perfForm.delivered) || 0))}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={savePerformance}
                    disabled={perfSaving}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {perfSaving ? 'Saving…' : `Save ${perfPeriod === 'Monthly' ? MONTH_NAMES[perfMonth] : `Q${perfQuarter + 1}`} numbers`}
                  </button>
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
          <Field label="UAN (for payslip)">
            <input value={form.uan} onChange={(e) => setForm((f) => ({ ...f, uan: e.target.value }))} className={inputClass} />
          </Field>

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

      <Modal
        open={!!payslipForm}
        onClose={closePayslip}
        title="Generate Payslip"
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {payslipForm && (() => {
          const totals = payslipTotals(payslipForm);
          return (
            <div className="flex flex-col gap-4">
              <img src="/logo.png" alt="Fute Services" className="h-9 w-auto self-start" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Company Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company Name">
                    <input value={payslipForm.companyName} onChange={(e) => updatePayslipField('companyName', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Company Address">
                    <input value={payslipForm.companyAddress} onChange={(e) => updatePayslipField('companyAddress', e.target.value)} className={inputClass} placeholder="Street, area" />
                  </Field>
                  <Field label="City, Pincode">
                    <input value={payslipForm.cityPincode} onChange={(e) => updatePayslipField('cityPincode', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Country">
                    <input value={payslipForm.country} onChange={(e) => updatePayslipField('country', e.target.value)} className={inputClass} />
                  </Field>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Employee Pay Summary</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Employee Name">
                    <input value={payslipForm.employeeName} onChange={(e) => updatePayslipField('employeeName', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Employee ID">
                    <input value={payslipForm.employeeId} onChange={(e) => updatePayslipField('employeeId', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Pay Period">
                    <input type="month" value={payslipForm.payPeriod} onChange={(e) => updatePayslipField('payPeriod', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Paid Days">
                    <input type="number" min="0" value={payslipForm.paidDays} onChange={(e) => updatePayslipField('paidDays', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Loss of Pay Days">
                    <input type="number" min="0" value={payslipForm.lopDays} onChange={(e) => updatePayslipField('lopDays', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Pay Date">
                    <input type="date" value={payslipForm.payDate} onChange={(e) => updatePayslipField('payDate', e.target.value)} className={inputClass} />
                  </Field>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Income Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                      <span>Earnings</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex flex-col gap-2.5 p-3">
                      {payslipForm.earnings.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 group">
                          <input
                            value={r.label}
                            onChange={(e) => updateEarning(r.id, 'label', e.target.value)}
                            placeholder="Label"
                            className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            value={r.amount}
                            onChange={(e) => updateEarning(r.id, 'amount', e.target.value)}
                            className="w-16 shrink-0 bg-transparent text-xs text-foreground text-right border-b border-dashed border-border focus-visible:outline-none focus-visible:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeEarning(r.id)}
                            className="text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addEarning} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline w-fit cursor-pointer">
                        <Plus size={12} /> Add Earnings
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted border-t border-border text-xs font-bold text-foreground">
                      <span>Gross Earnings</span>
                      <span>₹{totals.gross.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                      <span>Deductions</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex flex-col gap-2.5 p-3">
                      {payslipForm.deductions.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 group">
                          <input
                            value={r.label}
                            onChange={(e) => updateDeduction(r.id, 'label', e.target.value)}
                            placeholder="Label"
                            className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            value={r.amount}
                            onChange={(e) => updateDeduction(r.id, 'amount', e.target.value)}
                            className="w-16 shrink-0 bg-transparent text-xs text-foreground text-right border-b border-dashed border-border focus-visible:outline-none focus-visible:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeDeduction(r.id)}
                            className="text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addDeduction} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline w-fit cursor-pointer">
                        <Plus size={12} /> Add Deductions
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted border-t border-border text-xs font-bold text-foreground">
                      <span>Total Deductions</span>
                      <span>₹{totals.totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Total Net Payable</div>
                  <div className="text-[10px] text-muted-foreground">Gross Earnings − Total Deductions</div>
                </div>
                <div className="text-lg font-bold text-primary">₹{totals.net.toLocaleString('en-IN')}</div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Amount in words: {numberToWordsINR(totals.net)}</p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayslipForm(defaultPayslipForm(selected, attendanceRecords))}
                  className="px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => printPayslip(payslipForm)}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Generate Payslip
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </HrLayout>
  );
}
