import React, { useState } from 'react';
import { tint } from '../styles/seriesColors';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';
import {
  BarChart2,
  Calendar,
  Filter,
  Users,
  Cpu,
  TrendingUp,
  Code2,
  Megaphone,
  Palette,
  Factory,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CheckCircle2,
  Clock,
  Briefcase,
  Target,
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Eye,
} from 'lucide-react';

const TIMEFRAMES = [
  { id: '1w', label: '1 Week', multiplier: 1 },
  { id: '2w', label: '2 Weeks', multiplier: 2 },
  { id: '1m', label: '1 Month', multiplier: 4 },
  { id: '3m', label: '3 Months', multiplier: 12 },
  { id: '6m', label: '6 Months', multiplier: 24 },
];

const DEPARTMENTS = [
  { id: 'all', label: 'All Departments', icon: Layers },
  { id: 'hr', label: 'HR Department', icon: Users },
  { id: 'it', label: 'IT Service Desk', icon: Cpu },
  { id: 'sales', label: 'Sales Operations', icon: TrendingUp },
  { id: 'dev', label: 'Developer Portal', icon: Code2 },
  { id: 'marketing', label: 'Marketing Suite', icon: Megaphone },
  { id: 'branding', label: 'Branding Hub', icon: Palette },
  { id: 'production', label: 'Production', icon: Factory },
];

// One accent hex per department, used as a tinted icon/left-border instead
// of a full gradient fill — same device as the Founder Overview page.
const DEPT_ACCENT_HEX = {
  all: 'hsl(var(--chart-1))',
  hr: 'hsl(var(--chart-2))',
  it: 'hsl(var(--chart-3))',
  sales: 'hsl(var(--chart-4))',
  dev: 'hsl(var(--chart-5))',
  marketing: 'hsl(var(--chart-6))',
  branding: 'hsl(var(--chart-1))',
  production: 'hsl(var(--chart-2))',
};

const BASE_REPORT_DATA = {
  all: {
    title: 'Cross-Department Executive Summary',
    description: 'High-level operational performance and key deliverables across the entire organization',
    kpis: [
      { label: 'Total Tickets Resolved', base: 42, unit: '', trend: '+14%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'New Hires Onboarded', base: 3, unit: '', trend: '+50%', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Revenue Generated', base: 12.5, unit: 'LAKH', trend: '+8%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'System Uptime SLA', base: 99.8, unit: '%', trend: 'Stable', isUp: true, accent: 'hsl(var(--chart-5))' },
    ],
    breakdown: [
      { title: 'HR Recruitment & Attendance', progress: 92, stat: '28/30 Present Daily', color: 'from-muted to-muted' },
      { title: 'IT SLA Ticket Resolution', progress: 96, stat: '42 Tickets Closed', color: 'from-muted to-primary' },
      { title: 'Sales Pipeline Conversion', progress: 78, stat: '₹12.5L Closed Deals', color: 'from-primary to-primary' },
      { title: 'Dev Sprint Velocity', progress: 88, stat: '34 Story Points Done', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Q3 Onboarding Drive completed for 3 new engineers', dept: 'HR', status: 'Completed', date: '2 days ago' },
      { activity: 'Server Migration & AWS Firewall Rule update', dept: 'IT', status: 'Success', date: '3 days ago' },
      { activity: 'Enterprise SaaS Deal signed with Apex Tech', dept: 'Sales', status: 'Closed', date: '4 days ago' },
    ],
  },
  hr: {
    title: 'HR & People Operations Report',
    description: 'Recruitment velocity, employee attendance rates, leaves, and candidate funnel health',
    kpis: [
      { label: 'New Hires Onboarded', base: 3, unit: '', trend: '+25%', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Avg Attendance Rate', base: 94.5, unit: '%', trend: '+1.2%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Leaves Processed', base: 6, unit: '', trend: '-10%', isUp: false, accent: 'hsl(var(--chart-4))' },
      { label: 'Candidates in Pipeline', base: 14, unit: '', trend: '+4 New', isUp: true, accent: 'hsl(var(--chart-5))' },
    ],
    breakdown: [
      { title: 'Technical Hiring Pipeline', progress: 85, stat: '8 Candidates shortlisted', color: 'from-muted to-muted' },
      { title: 'Employee Satisfaction Score', progress: 91, stat: '4.55 / 5.0 Rating', color: 'from-primary to-primary' },
      { title: 'Leave Approval Turnaround', progress: 95, stat: '< 4 Hours Avg', color: 'from-warning to-primary' },
    ],
    logs: [
      { activity: 'Offer extended to Senior Frontend Developer candidate', dept: 'HR', status: 'Offered', date: 'Yesterday' },
      { activity: 'Monthly attendance compliance audit generated', dept: 'HR', status: 'Verified', date: '3 days ago' },
    ],
  },
  it: {
    title: 'IT Service Desk & Infra Report',
    description: 'Infrastructure uptime, helpdesk ticket SLAs, asset assignments, and security monitoring',
    kpis: [
      { label: 'IT Tickets Resolved', base: 42, unit: '', trend: '+18%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Avg Resolution Time', base: 1.4, unit: 'HRS', trend: '-20%', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Assets Allocated', base: 5, unit: 'Units', trend: 'On Schedule', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Infrastructure Uptime', base: 99.9, unit: '%', trend: '100% SLA', isUp: true, accent: 'hsl(var(--chart-5))' },
    ],
    breakdown: [
      { title: 'Hardware Repair & Replacements', progress: 90, stat: '9/10 Closed', color: 'from-muted to-muted' },
      { title: 'Software Access & Credential Grants', progress: 98, stat: '24 Requests Fulfilled', color: 'from-primary to-primary' },
      { title: 'Network & VPN SLA', progress: 99, stat: 'Zero Downtime', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Allocated 3 MacBook M2 Pro units to dev team', dept: 'IT', status: 'Assigned', date: '1 day ago' },
      { activity: 'Resolved high-priority DNS VPN connection ticket', dept: 'IT', status: 'Resolved', date: '2 days ago' },
    ],
  },
  sales: {
    title: 'Sales & Revenue Operations Report',
    description: 'Closed revenue, active client leads, deal conversion rate, and pipeline value',
    kpis: [
      { label: 'Closed Revenue', base: 12.5, unit: 'LAKH', trend: '+15%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Deals Closed', base: 8, unit: '', trend: '+2 Deals', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Active Pipeline Leads', base: 26, unit: '', trend: '+6 New', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Conversion Rate', base: 31, unit: '%', trend: '+3.5%', isUp: true, accent: 'hsl(var(--chart-1))' },
    ],
    breakdown: [
      { title: 'Enterprise Deals Conversion', progress: 75, stat: '₹9.0L Revenue', color: 'from-primary to-primary' },
      { title: 'SMB SaaS Subscriptions', progress: 88, stat: '₹3.5L Revenue', color: 'from-warning to-primary' },
      { title: 'Client Renewal Rate', progress: 94, stat: '100% Retention', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Closed ₹5.5L annual contract with TechCorp Solutions', dept: 'Sales', status: 'Won', date: 'Yesterday' },
      { activity: 'Submitted proposal to Horizon Global', dept: 'Sales', status: 'Pending', date: '3 days ago' },
    ],
  },
  dev: {
    title: 'Engineering & Developer Portal Report',
    description: 'Code commits, deployment builds, sprint task velocity, and pull request approvals',
    kpis: [
      { label: 'Sprint Tasks Completed', base: 34, unit: '', trend: '+12%', isUp: true, accent: 'hsl(var(--chart-5))' },
      { label: 'Code Commits Pushed', base: 142, unit: '', trend: '+28%', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Production Deploys', base: 9, unit: '', trend: '0 Bugs', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'PR Review Time', base: 2.1, unit: 'HRS', trend: '-15%', isUp: true, accent: 'hsl(var(--chart-6))' },
    ],
    breakdown: [
      { title: 'Frontend Component Refactoring', progress: 95, stat: '18 PRs Merged', color: 'from-muted to-muted' },
      { title: 'Backend API Microservices', progress: 82, stat: '12 APIs Live', color: 'from-muted to-muted' },
      { title: 'Automated Test Coverage', progress: 89, stat: '89.4% Passed', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Deployed v2.4.0 Release Build to Staging & Production', dept: 'Developers', status: 'Live', date: '1 day ago' },
      { activity: 'Merged Auth JWT Refactor & Firebase optimization', dept: 'Developers', status: 'Merged', date: '2 days ago' },
    ],
  },
  marketing: {
    title: 'Marketing Suite & Campaigns Report',
    description: 'Ad campaign reach, click-through rates, social channel impressions, and lead generation',
    kpis: [
      { label: 'Total Impressions', base: 145, unit: 'K', trend: '+35%', isUp: true, accent: 'hsl(var(--chart-6))' },
      { label: 'Inbound Leads Generated', base: 48, unit: '', trend: '+18%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Ad Spend ROI (ROAS)', base: 4.2, unit: 'x', trend: '+0.5x', isUp: true, accent: 'hsl(var(--chart-1))' },
      { label: 'Click-Through Rate (CTR)', base: 3.8, unit: '%', trend: '+0.4%', isUp: true, accent: 'hsl(var(--chart-3))' },
    ],
    breakdown: [
      { title: 'LinkedIn B2B Outreach Campaign', progress: 88, stat: '28 Inbound Leads', color: 'from-primary to-warning' },
      { title: 'Google Search Ads Campaign', progress: 80, stat: '14 Conversion Deals', color: 'from-warning to-primary' },
      { title: 'Organic Content Impressions', progress: 94, stat: '65K Impressions', color: 'from-destructive to-destructive' },
    ],
    logs: [
      { activity: 'Launched Q3 Product Announcement video campaign', dept: 'Marketing', status: 'Active', date: 'Yesterday' },
      { activity: 'Published monthly technical blog post series', dept: 'Marketing', status: 'Published', date: '4 days ago' },
    ],
  },
  branding: {
    title: 'Branding & Creative Media Hub Report',
    description: 'Brand asset releases, design guidelines compliance, press mentions, and collateral created',
    kpis: [
      { label: 'Brand Assets Published', base: 18, unit: '', trend: '+6 Assets', isUp: true, accent: 'hsl(var(--chart-1))' },
      { label: 'Media Kit Downloads', base: 64, unit: '', trend: '+22%', isUp: true, accent: 'hsl(var(--chart-5))' },
      { label: 'Press & Media Mentions', base: 5, unit: '', trend: '+2 Outlets', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Brand Compliance Score', base: 98, unit: '%', trend: 'Top Tier', isUp: true, accent: 'hsl(var(--chart-4))' },
    ],
    breakdown: [
      { title: 'Corporate Identity Guidelines v3', progress: 100, stat: 'Finalized', color: 'from-muted to-destructive' },
      { title: 'Executive Presentation Deck', progress: 92, stat: 'Completed', color: 'from-muted to-muted' },
      { title: 'Social Media Banner Kit', progress: 86, stat: '12 Templates', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Updated 2026 Brand Design Guidelines & Vector Logos', dept: 'Branding', status: 'Released', date: '2 days ago' },
      { activity: 'Designed custom pitch deck slides for Founder Keynote', dept: 'Branding', status: 'Delivered', date: '5 days ago' },
    ],
  },
  production: {
    title: 'Production & Operations Performance',
    description: 'Output targets, manufacturing quality check pass rates, maintenance downtime, and efficiency',
    kpis: [
      { label: 'Units Manufactured', base: 450, unit: 'Units', trend: '+10%', isUp: true, accent: 'hsl(var(--chart-2))' },
      { label: 'Quality Pass Rate', base: 99.2, unit: '%', trend: '+0.5%', isUp: true, accent: 'hsl(var(--chart-4))' },
      { label: 'Assembly Line Efficiency', base: 92, unit: '%', trend: 'Optimal', isUp: true, accent: 'hsl(var(--chart-3))' },
      { label: 'Unplanned Downtime', base: 0.5, unit: 'HRS', trend: '-50%', isUp: true, accent: 'hsl(var(--chart-4))' },
    ],
    breakdown: [
      { title: 'Batch #A-102 Quality Check', progress: 99, stat: '448/450 Approved', color: 'from-muted to-muted' },
      { title: 'Machine Maintenance SLA', progress: 95, stat: '100% Scheduled', color: 'from-primary to-primary' },
      { title: 'Packaging & Dispatch Rate', progress: 88, stat: 'On Schedule', color: 'from-muted to-muted' },
    ],
    logs: [
      { activity: 'Completed preventive maintenance on Line-B automated station', dept: 'Production', status: 'Verified', date: '3 days ago' },
      { activity: 'Dispatched Batch #A-101 to regional distribution hub', dept: 'Production', status: 'Dispatched', date: '4 days ago' },
    ],
  },
};

export default function FounderReportsView() {
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1w');
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'raw'

  useEscapeToClose(showExportModal, () => setShowExportModal(false));

  const currentDeptConfig = DEPARTMENTS.find((d) => d.id === selectedDept) || DEPARTMENTS[0];
  const currentTimeframeConfig = TIMEFRAMES.find((t) => t.id === selectedTimeframe) || TIMEFRAMES[0];
  const deptData = BASE_REPORT_DATA[selectedDept] || BASE_REPORT_DATA['all'];
  const mult = currentTimeframeConfig.multiplier;

  // Compute dynamic KPIs
  const computedKpis = deptData.kpis.map((kpi) => {
    let dynamicVal;
    if (kpi.unit === '%') {
      dynamicVal = Math.min(99.9, Number((kpi.base + mult * 0.05).toFixed(1)));
    } else if (kpi.unit === 'LAKH') {
      dynamicVal = (kpi.base * Math.sqrt(mult)).toFixed(1);
    } else if (kpi.unit === 'HRS') {
      dynamicVal = Math.max(0.5, (kpi.base / Math.sqrt(mult)).toFixed(1));
    } else {
      dynamicVal = Math.round(kpi.base * mult);
    }
    return { ...kpi, value: dynamicVal };
  });

  // Construct CSV content string
  const buildCsvContent = () => {
    const lines = [];
    lines.push(`"FUTE SERVICES — EXECUTIVE REPORT"`);
    lines.push(`"Department","${currentDeptConfig.label}"`);
    lines.push(`"Timeframe","${currentTimeframeConfig.label}"`);
    lines.push(`"Generated Date","${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}"`);
    lines.push(``);
    lines.push(`"=== KEY PERFORMANCE INDICATORS ==="`);
    lines.push(`"Metric Name","Value","Unit","Trend vs Previous Period"`);
    computedKpis.forEach((kpi) => {
      lines.push(`"${kpi.label}","${kpi.value}","${kpi.unit || '-'}","${kpi.trend}"`);
    });
    lines.push(``);
    lines.push(`"=== PERFORMANCE DELIVERABLES ==="`);
    lines.push(`"Deliverable Title","Progress %","Current Status Stat"`);
    deptData.breakdown.forEach((item) => {
      lines.push(`"${item.title}","${item.progress}%","${item.stat}"`);
    });
    lines.push(``);
    lines.push(`"=== RECENT MILESTONES & AUDIT LOG ==="`);
    lines.push(`"Activity Highlight","Department","Status","Recorded Time"`);
    deptData.logs.forEach((log) => {
      lines.push(`"${log.activity}","${log.dept}","${log.status}","${log.date}"`);
    });
    return lines.join('\n');
  };

  // Trigger CSV File Download directly
  const handleDownloadCsv = () => {
    const csvData = buildCsvContent();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${currentDeptConfig.label.replace(/\s+/g, '_')}_Report_${currentTimeframeConfig.id}.csv`;
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy CSV to Clipboard
  const handleCopyCsv = () => {
    navigator.clipboard.writeText(buildCsvContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Department-Wise Executive Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive analytics, KPIs, and deliverables across all departments & timeframes
            </p>
          </div>
        </div>

        {/* Timeframe Filter Selector (1w, 2w, 1m, 3m, 6m) */}
        <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-xl border border-border self-stretch md:self-auto justify-center">
          <Calendar size={14} className="text-muted-foreground ml-1 mr-1 shrink-0" />
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTimeframe === tf.id
                  ? 'bg-gradient-to-r from-muted to-muted text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Department Selector Tabs Bar */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DEPARTMENTS.map((dept) => {
          const IconComp = dept.icon;
          const isSelected = selectedDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-muted border-border text-foreground shadow scale-[1.02]'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
              }`}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: tint(DEPT_ACCENT_HEX[dept.id], 0.1), color: DEPT_ACCENT_HEX[dept.id] }}
              >
                <IconComp size={13} />
              </div>
              <span>{dept.label}</span>
            </button>
          );
        })}
      </div>

      {/* Department Header Summary Banner */}
      <div className="bg-card border border-border border-l-2 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderLeftColor: DEPT_ACCENT_HEX[selectedDept] }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
              Time Period: {currentTimeframeConfig.label}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
              Verified Data
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground tracking-tight">{deptData.title}</h3>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 max-w-2xl">{deptData.description}</p>
        </div>

        {/* CLICKABLE EXPORT REPORT BUTTON */}
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-primary-foreground flex items-center gap-2 shadow transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          <FileSpreadsheet size={16} />
          <span>Export Report (CSV)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Key Performance Indicators ({currentTimeframeConfig.label})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {computedKpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{kpi.label}</span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 ${
                    kpi.isUp
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-warning/10 text-warning border border-warning/20'
                  }`}
                >
                  {kpi.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {kpi.trend}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-foreground" style={{ color: kpi.accent }}>
                  {kpi.value}
                </span>
                {kpi.unit && <span className="text-xs font-bold text-muted-foreground">{kpi.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance & Deliverables Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Progress & Targets Breakdown */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Performance Deliverables</h4>
              <p className="text-xs text-muted-foreground">Target completion & key metric status for {currentTimeframeConfig.label}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-muted/10 text-muted-foreground border border-muted/20">
              {currentDeptConfig.label}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {deptData.breakdown.map((item) => (
              <div key={item.title} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{item.title}</span>
                  <span className="text-xs font-mono text-muted-foreground">{item.stat} ({item.progress}%)</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                  <div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Recent Department Activity Log */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-foreground">Milestones & Audit Log</h4>
            <p className="text-xs text-muted-foreground">Recent recorded highlights ({currentTimeframeConfig.label})</p>
          </div>

          <div className="flex flex-col gap-3">
            {deptData.logs.map((log, index) => (
              <div key={index} className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider">{log.dept}</span>
                  <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-bold">
                    {log.status}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-snug font-medium">{log.activity}</p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {log.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CSV EXPORT PREVIEW MODAL ================= */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          {...backdropProps(() => setShowExportModal(false))}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report CSV Data Preview"
            className="bg-background border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >

            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-muted border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    Report CSV Data Preview
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      {currentDeptConfig.label}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Preview the compiled CSV data for <strong>{currentTimeframeConfig.label}</strong> before downloading
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="px-5 pt-3 flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border text-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Formatted Table
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    viewMode === 'raw' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Raw CSV Text
                </button>
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                Filename: {currentDeptConfig.label.replace(/\s+/g, '_')}_Report_{currentTimeframeConfig.id}.csv
              </span>
            </div>

            {/* Modal Body - Data Content */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[450px]">
              {viewMode === 'table' ? (
                <div className="flex flex-col gap-5">
                  {/* Metadata Summary */}
                  <div className="bg-muted border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground text-xs block">DEPARTMENT</span>
                      <strong className="text-foreground">{currentDeptConfig.label}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">TIMEFRAME</span>
                      <strong className="text-foreground">{currentTimeframeConfig.label}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">KPI METRICS</span>
                      <strong className="text-primary">{computedKpis.length} Indicators</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">DELIVERABLES</span>
                      <strong className="text-muted-foreground">{deptData.breakdown.length} Tasks</strong>
                    </div>
                  </div>

                  {/* KPIs Preview Table */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">1. Key Performance Indicators</h4>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-muted-foreground">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase font-bold border-b border-border">
                          <tr>
                            <th className="p-2.5">Metric Name</th>
                            <th className="p-2.5">Value</th>
                            <th className="p-2.5">Unit</th>
                            <th className="p-2.5">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {computedKpis.map((kpi) => (
                            <tr key={kpi.label} className="hover:bg-accent">
                              <td className="p-2.5 font-bold text-foreground">{kpi.label}</td>
                              <td className="p-2.5 font-mono text-primary font-bold">{kpi.value}</td>
                              <td className="p-2.5 text-muted-foreground">{kpi.unit || '-'}</td>
                              <td className="p-2.5 font-bold text-muted-foreground">{kpi.trend}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Deliverables Table */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">2. Performance Deliverables</h4>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-muted-foreground">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase font-bold border-b border-border">
                          <tr>
                            <th className="p-2.5">Deliverable Title</th>
                            <th className="p-2.5">Progress</th>
                            <th className="p-2.5">Current Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {deptData.breakdown.map((item) => (
                            <tr key={item.title} className="hover:bg-accent">
                              <td className="p-2.5 font-bold text-foreground">{item.title}</td>
                              <td className="p-2.5 font-mono text-muted-foreground font-bold">{item.progress}%</td>
                              <td className="p-2.5 text-muted-foreground">{item.stat}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Milestones Log Table */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">3. Milestones & Audit Log</h4>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-muted-foreground">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase font-bold border-b border-border">
                          <tr>
                            <th className="p-2.5">Activity Highlight</th>
                            <th className="p-2.5">Department</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {deptData.logs.map((log, index) => (
                            <tr key={index} className="hover:bg-accent">
                              <td className="p-2.5 font-medium text-foreground">{log.activity}</td>
                              <td className="p-2.5 text-muted-foreground font-bold">{log.dept}</td>
                              <td className="p-2.5 text-primary font-bold">{log.status}</td>
                              <td className="p-2.5 text-muted-foreground">{log.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Raw CSV Text Format View */
                <pre className="bg-card p-4 rounded-xl border border-border text-xs font-mono text-primary/90 whitespace-pre-wrap leading-relaxed">
                  {buildCsvContent()}
                </pre>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 bg-muted border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyCsv}
                className="px-3.5 py-2 bg-muted hover:bg-accent border border-border rounded-xl text-xs font-bold text-muted-foreground flex items-center gap-2 transition-all cursor-pointer"
              >
                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Raw CSV'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-accent border border-border rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDownloadCsv();
                    setShowExportModal(false);
                  }}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-primary-foreground flex items-center gap-2 shadow transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download CSV File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
