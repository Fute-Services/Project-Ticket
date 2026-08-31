import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal, { STAGES, stageForStatus, STAGE_DEFAULT_STATUS } from '../../components/sales/LeadProfileModal';
import { SectionHeader, Badge } from '../../components/ui';
import { salesLeadsApi } from '../../utils/api';
import { useSalesDesk } from '../../context/SalesDeskContext';

export default function Pipeline() {
  const { leads, setLeads } = useSalesDesk();
  const [selected, setSelected] = useState(null);
  const [advancing, setAdvancing] = useState(null);

  const columns = useMemo(() => {
    const active = leads.filter((l) => l.status !== 'Lost');
    const byStage = Object.fromEntries(STAGES.map((s) => [s, []]));
    active.forEach((l) => byStage[stageForStatus(l.status)].push(l));
    return byStage;
  }, [leads]);

  async function advance(lead) {
    const idx = STAGES.indexOf(stageForStatus(lead.status));
    if (idx === -1 || idx === STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1];
    setAdvancing(lead.id);
    try {
      const { data } = await salesLeadsApi.update(lead.id, { status: STAGE_DEFAULT_STATUS[nextStage] });
      setLeads((rows) => rows.map((l) => (l.id === lead.id ? { ...l, ...data } : l)));
    } catch (e) {
      toast.error('Could not move lead', { description: e.response?.data?.error || e.message });
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full flex-1 min-h-0">
        <SectionHeader title="Pipeline" subtitle="Click the arrow to move a lead into the next stage" />

        <div className="flex-1 min-h-0 overflow-x-auto">
          <div className="flex gap-3 h-full pb-2" style={{ minWidth: STAGES.length * 260 }}>
            {STAGES.map((stage) => {
              const stageLeads = columns[stage] || [];
              const value = stageLeads.reduce((s, l) => s + (Number(l.dealValue) || 0), 0);
              return (
                <div key={stage} className="flex-1 min-w-[240px] bg-card border border-border rounded-xl p-3 flex flex-col">
                  <div className="mb-3">
                    <div className="text-xs font-bold text-foreground">{stage}</div>
                    <div className="text-[10px] text-muted-foreground">{stageLeads.length} leads · ₹{value.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                    {stageLeads.map((l) => (
                      <div key={l.id} className="p-2.5 rounded-lg bg-muted border border-border">
                        <button type="button" onClick={() => setSelected(l)} className="w-full text-left cursor-pointer">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground truncate">{l.companyName}</span>
                            <Badge value={l.priority} />
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{l.assignedTo || 'Unassigned'}</div>
                          {l.dealValue > 0 && <div className="text-[10px] font-semibold text-foreground mt-0.5">₹{Number(l.dealValue).toLocaleString('en-IN')}</div>}
                        </button>
                        {stage !== 'Closure' && (
                          <button
                            type="button"
                            onClick={() => advance(l)}
                            disabled={advancing === l.id}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
                          >
                            Move to next stage <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />
    </SalesLayout>
  );
}
