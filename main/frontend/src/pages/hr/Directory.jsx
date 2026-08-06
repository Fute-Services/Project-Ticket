import { useMemo, useState } from 'react';
import { Search, Mail, Phone, Calendar, Landmark } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Drawer, EmptyState } from '../../components/ui';
import { employees, bankDetails } from '../../data/hrMockData';

const DEPARTMENTS = ['All', ...new Set(employees.map((e) => e.department))];

export default function Directory() {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (dept !== 'All' && e.department !== dept) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
    });
  }, [query, dept]);

  const bank = selected ? bankDetails[selected.id] : null;

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Employee Directory" subtitle={`${filtered.length} of ${employees.length} employees`} />

        <Card>
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or role..."
                className="w-full bg-[#18181c] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {DEPARTMENTS.map((d) => (
              <Pill key={d} active={dept === d} onClick={() => setDept(d)}>{d}</Pill>
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
                  className="text-left p-4 rounded-2xl bg-[#18181c] border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-[#e86024]/15 border border-[#e86024]/30 flex items-center justify-center font-bold text-xs text-[#e86024] shrink-0">
                      {e.photo}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{e.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{e.designation}</div>
                    </div>
                    <Badge value={e.status} className="ml-auto shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1.5 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5"><Mail size={11} className="text-gray-500" /> {e.email}</div>
                    <div className="flex items-center gap-1.5"><Phone size={11} className="text-gray-500" /> {e.phone}</div>
                    <div className="flex items-center gap-1.5"><Calendar size={11} className="text-gray-500" /> Joined {e.joiningDate}</div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/5 text-[10px] text-gray-500">
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
              <div className="w-14 h-14 rounded-full bg-[#e86024]/15 border border-[#e86024]/30 flex items-center justify-center font-bold text-sm text-[#e86024] shrink-0">
                {selected.photo}
              </div>
              <div className="min-w-0">
                <div className="text-base font-extrabold text-white truncate">{selected.name}</div>
                <div className="text-xs text-gray-400 truncate">{selected.designation}</div>
              </div>
              <Badge value={selected.status} className="ml-auto shrink-0" />
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-gray-300"><Mail size={13} className="text-[#e86024]" /> {selected.email}</div>
              <div className="flex items-center gap-2 text-gray-300"><Phone size={13} className="text-[#e86024]" /> {selected.phone}</div>
              <div className="flex items-center gap-2 text-gray-300"><Calendar size={13} className="text-[#e86024]" /> Joined {selected.joiningDate}</div>
            </div>

            <div className="text-[10px] text-gray-500 pt-2 border-t border-white/5">
              {selected.department} · Reports to {selected.manager}
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
                <Landmark size={12} className="text-[#e86024]" /> Bank Details
              </div>
              {bank ? (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#18181c] border border-white/5 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Account Holder</span><span className="text-gray-200 font-medium">{bank.accountHolder}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="text-gray-200 font-medium">{bank.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="text-gray-200 font-medium">{bank.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">IFSC</span><span className="text-gray-200 font-medium">{bank.ifsc}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Branch</span><span className="text-gray-200 font-medium">{bank.branch}</span></div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No bank details on file.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </HrLayout>
  );
}
