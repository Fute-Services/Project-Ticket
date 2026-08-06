import { useMemo, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, StatCard, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { leaveBalances, employees, LEAVE_TYPES } from '../../data/hrMockData';
import { useLeave, isFounderApproval } from '../../context/LeaveContext';

const EMPTY_FORM = { employeeId: employees[0].id, type: 'Casual Leave', from: '', to: '', reason: '' };

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const diff = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff) + 1);
}

export default function Leave() {
  const { leaveRequests: requests, decide, applyLeave } = useLeave();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const counts = useMemo(() => {
    const c = { Pending: 0, Approved: 0, Rejected: 0 };
    requests.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [requests]);

  function submit(e) {
    e.preventDefault();
    const employee = employees.find((emp) => emp.id === form.employeeId);
    const id = `LV-${300 + requests.length + 1}`;
    applyLeave({
      id,
      employeeId: form.employeeId,
      employee: employee.name,
      type: form.type,
      from: form.from,
      to: form.to,
      days: daysBetween(form.from, form.to),
      reason: form.reason,
      status: 'Pending',
    });
    setForm(EMPTY_FORM);
    setShowModal(false);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Leave Management"
          subtitle={`${counts.Pending} pending review`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Apply Leave
            </button>
          }
        />

        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Check} label="Pending" value={counts.Pending} accent="#f59e0b" />
          <StatCard icon={Check} label="Approved" value={counts.Approved} accent="#22c55e" />
          <StatCard icon={X} label="Rejected" value={counts.Rejected} accent="#ef4444" />
        </div>

        <Card>
          <SectionHeader
            title="Leave Requests"
            subtitle="HR and IT staff leave goes to the Founder for approval — HR only decides everyone else's."
          />
          {requests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Dates</th>
                    <th className="py-3 px-3">Days</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map((r) => {
                    const founderOwned = isFounderApproval(r);
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-3 font-bold text-white">{r.employee}</td>
                        <td className="py-3.5 px-3 text-gray-300">{r.type}</td>
                        <td className="py-3.5 px-3 text-gray-400">{r.from} → {r.to}</td>
                        <td className="py-3.5 px-3 text-gray-400">{r.days}</td>
                        <td className="py-3.5 px-3 text-gray-400 max-w-[160px] truncate">{r.reason}</td>
                        <td className="py-3.5 px-3"><Badge value={r.status} /></td>
                        <td className="py-3.5 px-3">
                          {r.status !== 'Pending' ? (
                            <span className="text-gray-600">—</span>
                          ) : founderOwned ? (
                            <span className="text-[10px] text-gray-500 italic">Awaiting Founder</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => decide(r.id, 'Approved')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer">
                                <Check size={13} />
                              </button>
                              <button type="button" onClick={() => decide(r.id, 'Rejected')} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer">
                                <X size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Leave Balances" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaveBalances.map((b) => {
              const employee = employees.find((e) => e.id === b.employeeId);
              return (
                <div key={b.employeeId} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5">
                  <div className="text-xs font-bold text-white mb-2">{employee?.name}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-extrabold text-white">{b.casual}</div>
                      <div className="text-[9px] text-gray-500">Casual</div>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white">{b.sick}</div>
                      <div className="text-[9px] text-gray-500">Sick</div>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white">{b.earned}</div>
                      <div className="text-[9px] text-gray-500">Earned</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Apply Leave">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Employee">
            <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputClass}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Leave Type">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input required type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="To">
              <input required type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Reason">
            <textarea required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputClass} rows={2} />
          </Field>
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Submit Request
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
