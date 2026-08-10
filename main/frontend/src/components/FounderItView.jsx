import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Cpu,
  Server,
  Clock,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';

const INITIAL_IT_COMPLAINTS = [
  {
    id: 'FT-IT-1049',
    name: 'Rahul Sen',
    department: 'Engineering',
    category: 'Server & Cloud',
    issue: 'AWS Staging Server High CPU Utilization & Memory Spike (98%)',
    priority: 'High',
    submittedAt: '1 hour ago',
    status: 'Pending',
  },
  {
    id: 'FT-IT-1033',
    name: 'Sneha Iyer',
    department: 'Engineering',
    category: 'Hardware',
    issue: 'MacBook Pro M2 Display flickering & Battery Thermal Throttling',
    priority: 'High',
    submittedAt: '3 hours ago',
    status: 'In Progress',
  },
  {
    id: 'FT-IT-1021',
    name: 'Devansh Gupta',
    department: 'Sales',
    category: 'Network & VPN',
    issue: 'OpenVPN Client SSL Certificate Expiry & Connection Failure',
    priority: 'Medium',
    submittedAt: '5 hours ago',
    status: 'Pending',
  },
  {
    id: 'FT-IT-1008',
    name: 'Ananya Rao',
    department: 'Marketing',
    category: 'Software Licensing',
    issue: 'Figma Enterprise Workspace Seat Renewal & Asset Permission',
    priority: 'Low',
    submittedAt: '1 day ago',
    status: 'Resolved',
  },
];

const HARDWARE_PROCUREMENT_LOGS = [
  {
    item: '3x MacBook Pro M2 (16GB/512GB)',
    requestedFor: 'Engineering New Joiners Batch',
    estimatedCost: '₹4.5 Lakh',
    status: 'Approved & Dispatched',
    date: 'Yesterday',
  },
  {
    item: '4x Dell UltraSharp 27" 4K Monitors',
    requestedFor: 'UI/UX Design & Branding Hub',
    estimatedCost: '₹1.2 Lakh',
    status: 'Procurement In Progress',
    date: '2 days ago',
  },
  {
    item: 'Production Server IAM Access Grant',
    requestedFor: 'Arjun Verma (On-Call Rotation)',
    estimatedCost: 'N/A (Access Control)',
    status: 'Access Granted',
    date: '3 days ago',
  },
];

const TICKET_CATEGORIES = [
  { category: 'Hardware & Device Repair', count: 18, pct: 40, color: 'from-muted to-muted' },
  { category: 'Software & Tools Licensing', count: 14, pct: 30, color: 'from-muted to-muted' },
  { category: 'Network & VPN Access', count: 9, pct: 20, color: 'from-primary to-primary' },
  { category: 'System Security Credentials', count: 5, pct: 10, color: 'from-warning to-primary' },
];

export default function FounderItView() {
  const [complaints, setComplaints] = useState(INITIAL_IT_COMPLAINTS);

  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;

  const handleUpdateStatus = (id, newStatus) => {
    const item = complaints.find((c) => c.id === id);
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    toast.success(`${id} → ${newStatus}`, { description: item?.issue });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Section Header */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">IT Service Desk Overview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Infrastructure SLA, active helpdesk tickets, device allocation, and procurement status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs font-semibold uppercase px-3 py-1.5 rounded-xl bg-muted/10 border border-muted/20 text-muted-foreground">
            ● 99.9% System Uptime
          </span>
        </div>
      </div>

      {/* 1. 📊 EXECUTIVE IT METRIC CARDS (TOP HEADER - 4 NUMBERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: System Uptime SLA */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Uptime SLA</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Activity size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-primary">99.9%</span>
            <span className="text-xs font-semibold text-muted-foreground">Servers Online</span>
          </div>
        </div>

        {/* Card 2: Active IT Tickets */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active IT Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-muted/10 border border-muted/20 text-muted-foreground flex items-center justify-center">
              <Cpu size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-muted-foreground">{complaints.length}</span>
            <span className="text-xs font-semibold text-warning">{pendingCount} Pending</span>
          </div>
        </div>

        {/* Card 3: Avg SLA Resolution Time */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg SLA Resolution</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">1.4 HRS</span>
            <span className="text-xs font-semibold text-primary">-20% vs SLA</span>
          </div>
        </div>

        {/* Card 4: IT Assets Issued */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IT Assets Issued</span>
            <div className="w-7 h-7 rounded-lg bg-muted/10 border border-muted/20 text-muted-foreground flex items-center justify-center">
              <Laptop size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-muted-foreground">38 / 45</span>
            <span className="text-xs font-semibold text-muted-foreground">Devices in use</span>
          </div>
        </div>
      </div>

      {/* 2. 💻 TICKET CATEGORY BREAKDOWN */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">IT Helpdesk Ticket Category Breakdown</h3>
            <p className="text-xs text-muted-foreground">Distribution of support requests by technical domain</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
            Total 46 Tickets Logged
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {TICKET_CATEGORIES.map((item) => (
            <div key={item.category} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-44 shrink-0 truncate font-semibold">{item.category}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-14 text-right shrink-0">{item.count} tickets ({item.pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 🚨 CRITICAL IT COMPLAINTS & 4. ⚡ HARDWARE PROCUREMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. CRITICAL IT COMPLAINTS & ESCALATIONS */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
                <AlertTriangle size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Critical IT Complaints & Escalations
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning/20 text-warning rounded-full border border-warning/30">
                      {pendingCount} Pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">High SLA priority hardware and infrastructure tickets</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {complaints.map((item) => {
              const isResolved = item.status === 'Resolved';
              const isInProgress = item.status === 'In Progress';
              const isPending = item.status === 'Pending';

              const priorityStyle =
                item.priority === 'High'
                  ? 'bg-destructive/20 text-destructive border-destructive/30'
                  : item.priority === 'Medium'
                  ? 'bg-warning/20 text-warning border-warning/30'
                  : 'bg-muted/20 text-muted-foreground border-muted/30';

              return (
                <div key={item.id} className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground truncate">{item.name}</h4>
                        <span className="text-xs font-bold text-muted-foreground">({item.department})</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.2 rounded border ${priorityStyle}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.issue}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isResolved ? (
                        <span className="px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Resolved
                        </span>
                      ) : isInProgress ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'Resolved')}
                          className="px-2.5 py-1 bg-muted/20 hover:bg-muted/30 border border-muted/40 text-muted-foreground text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'In Progress')}
                          className="px-2.5 py-1 bg-warning/20 hover:bg-warning/30 border border-warning/40 text-warning text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          In Progress
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border">
                    <span>Ticket ID: <strong>{item.id}</strong> · {item.category}</span>
                    <span>{item.submittedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ⚡ HARDWARE PROCUREMENT & SYSTEM ACCESS LOG */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
                <HardDrive size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Hardware Procurement & Access Log</h3>
                <p className="text-xs text-muted-foreground">Equipment orders & critical system grants</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {HARDWARE_PROCUREMENT_LOGS.map((item) => (
              <div key={item.item} className="bg-muted border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">{item.item}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">For: <strong>{item.requestedFor}</strong></p>
                  <span className="text-xs text-muted-foreground block mt-1">
                    Cost: <strong className="text-primary">{item.estimatedCost}</strong> · {item.date}
                  </span>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
