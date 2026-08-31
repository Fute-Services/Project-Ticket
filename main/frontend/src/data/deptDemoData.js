/**
 * Demo content for the departments that have no backend behind them yet:
 * Sales, Developers, Marketing, Branding, Production.
 *
 * HR and IT have their own hand-built views because their data is real
 * (leaves, tickets, assets flow through context). These five are illustrative
 * only - same shape for all of them so one component can render any of them,
 * but the *content* is department-specific on purpose. A sales pipeline and a
 * sprint board don't measure the same things, and demo data that pretends they
 * do is worse than no demo data.
 *
 * Every entry is labelled Demo in the UI so it can't be mistaken for live
 * numbers.
 */

export const DEPT_DEMO = {
  sales: {
    tagline: 'Pipeline health, deal stages, and quota attainment for the quarter',
    badge: '₹42.8L pipeline',
    kpis: [
      { label: 'Quarterly Revenue', value: '₹12.5L', note: '+8% vs last quarter', tone: 'primary' },
      { label: 'Open Pipeline', value: '₹42.8L', note: '23 active deals', tone: 'foreground' },
      { label: 'Win Rate', value: '34%', note: '+6 pts QoQ', tone: 'primary' },
      { label: 'Avg Deal Cycle', value: '28 days', note: '-4 days', tone: 'foreground' },
    ],
    breakdownTitle: 'Pipeline by deal stage',
    breakdownNote: 'Where the ₹42.8L currently sits',
    breakdownUnit: 'deals',
    breakdown: [
      { label: 'Qualified / Discovery', count: 9, pct: 39 },
      { label: 'Proposal Sent', count: 7, pct: 30 },
      { label: 'Negotiation', count: 4, pct: 18 },
      { label: 'Verbal Commit', count: 3, pct: 13 },
    ],
    itemsTitle: 'Deals needing a decision',
    itemsNote: 'Stalled or awaiting founder sign-off',
    items: [
      { id: 'DEAL-2291', title: 'Kotak Retail - annual support retainer', meta: 'Negotiation · ₹8.4L ARR', owner: 'Shivani AS', status: 'Awaiting approval', tone: 'warning', age: '2 days' },
      { id: 'DEAL-2274', title: 'Sundaram Logistics - fleet dashboard build', meta: 'Proposal sent · ₹6.2L', owner: 'Puja Thakur', status: 'Follow-up due', tone: 'warning', age: '5 days' },
      { id: 'DEAL-2260', title: 'Aakash Diagnostics - pilot to production', meta: 'Verbal commit · ₹11.0L', owner: 'Shivani AS', status: 'Contract drafting', tone: 'primary', age: '1 day' },
      { id: 'DEAL-2248', title: 'Meridian Hotels - POS integration', meta: 'Qualified · ₹3.9L', owner: 'Prathiti A C', status: 'Discovery call set', tone: 'muted', age: '1 week' },
    ],
    logTitle: 'Recent closes',
    log: [
      { title: 'Bharat Textiles - CRM rollout', detail: 'Closed won · ₹5.1L', by: 'Puja Thakur', when: 'Yesterday', status: 'Won' },
      { title: 'Vertex Media - analytics add-on', detail: 'Closed won · ₹2.3L', by: 'Prathiti A C', when: '3 days ago', status: 'Won' },
      { title: 'Orbit Foods - inventory module', detail: 'Lost to incumbent vendor', by: 'Shivani AS', when: '4 days ago', status: 'Lost' },
    ],
  },

  developers: {
    tagline: 'Sprint progress, build health, and deployment status across repos',
    badge: 'Sprint 24 · day 6 of 10',
    kpis: [
      { label: 'Sprint Completion', value: '62%', note: '18 of 29 points', tone: 'primary' },
      { label: 'Open Pull Requests', value: '11', note: '4 awaiting review', tone: 'foreground' },
      { label: 'Build Success Rate', value: '94%', note: 'last 50 builds', tone: 'primary' },
      { label: 'Open Bugs', value: '7', note: '2 marked critical', tone: 'foreground' },
    ],
    breakdownTitle: 'Sprint work by type',
    breakdownNote: 'Story points committed in Sprint 24',
    breakdownUnit: 'points',
    breakdown: [
      { label: 'Feature development', count: 14, pct: 48 },
      { label: 'Bug fixes', count: 8, pct: 28 },
      { label: 'Tech debt / refactor', count: 4, pct: 14 },
      { label: 'Infrastructure', count: 3, pct: 10 },
    ],
    itemsTitle: 'Blocked or at-risk work',
    itemsNote: 'Items unlikely to land in this sprint without help',
    items: [
      { id: 'FT-DEV-812', title: 'Payment webhook retries dropping events', meta: 'Bug · Critical · 5 pts', owner: 'Kumar Gautam', status: 'Blocked', tone: 'destructive', age: '2 days' },
      { id: 'FT-DEV-798', title: 'Migrate reporting queries off the primary DB', meta: 'Tech debt · 8 pts', owner: 'Yogesh Kumar', status: 'In review', tone: 'warning', age: '4 days' },
      { id: 'FT-DEV-786', title: 'SSO login for the coordinator dashboard', meta: 'Feature · 5 pts', owner: 'Saubhagya Anubhav', status: 'In progress', tone: 'primary', age: '1 day' },
      { id: 'FT-DEV-771', title: 'Flaky attendance test suite on CI', meta: 'Infrastructure · 3 pts', owner: 'Kumar Gautam', status: 'Needs triage', tone: 'muted', age: '1 week' },
    ],
    logTitle: 'Recent deployments',
    log: [
      { title: 'api-gateway v2.14.0', detail: 'Production · 0 rollbacks', by: 'Yogesh Kumar', when: 'Today, 11:20', status: 'Live' },
      { title: 'web-dashboard v3.8.2', detail: 'Production · hotfix for leave filter', by: 'Saubhagya Anubhav', when: 'Yesterday', status: 'Live' },
      { title: 'worker-jobs v1.9.0', detail: 'Staging · pending QA sign-off', by: 'Kumar Gautam', when: '2 days ago', status: 'Staging' },
    ],
  },

  marketing: {
    tagline: 'Campaign performance, lead sources, and spend against target',
    badge: '₹1.8L spent of ₹2.5L',
    kpis: [
      { label: 'Leads Generated', value: '486', note: '+22% MoM', tone: 'primary' },
      { label: 'Cost per Lead', value: '₹370', note: '-₹52 MoM', tone: 'primary' },
      { label: 'Budget Used', value: '72%', note: '₹1.8L of ₹2.5L', tone: 'foreground' },
      { label: 'Lead → Demo Rate', value: '18%', note: '87 demos booked', tone: 'foreground' },
    ],
    breakdownTitle: 'Leads by channel',
    breakdownNote: '486 leads captured this month',
    breakdownUnit: 'leads',
    breakdown: [
      { label: 'Organic search', count: 181, pct: 37 },
      { label: 'LinkedIn paid', count: 142, pct: 29 },
      { label: 'Referral & partner', count: 96, pct: 20 },
      { label: 'Email nurture', count: 67, pct: 14 },
    ],
    itemsTitle: 'Live campaigns',
    itemsNote: 'Running now, with spend to date',
    items: [
      { id: 'CMP-114', title: 'Q3 enterprise webinar series', meta: 'LinkedIn + email · ₹68k spent', owner: 'Lavanya Rathi', status: 'Running', tone: 'primary', age: '3 weeks in' },
      { id: 'CMP-109', title: 'Logistics vertical case-study push', meta: 'Organic + PR · ₹22k spent', owner: 'Lavanya Rathi', status: 'Running', tone: 'primary', age: '2 weeks in' },
      { id: 'CMP-107', title: 'Retargeting - abandoned demo requests', meta: 'Paid social · ₹41k spent', owner: 'Lavanya Rathi', status: 'Needs creative', tone: 'warning', age: '5 weeks in' },
      { id: 'CMP-102', title: 'Founder thought-leadership newsletter', meta: 'Email · ₹0 spend', owner: 'Lavanya Rathi', status: 'Draft', tone: 'muted', age: 'Not launched' },
    ],
    logTitle: 'Last month at a glance',
    log: [
      { title: 'Product launch announcement', detail: '11.2k reach · 4.1% CTR', by: 'Lavanya Rathi', when: 'Last month', status: 'Beat target' },
      { title: 'Hiring brand campaign', detail: '6.8k reach · 62 applications', by: 'Lavanya Rathi', when: 'Last month', status: 'Beat target' },
      { title: 'Trade publication sponsorship', detail: '₹45k spend · 19 leads', by: 'Lavanya Rathi', when: 'Last month', status: 'Under target' },
    ],
  },

  branding: {
    tagline: 'Asset library, design requests, and guideline compliance',
    badge: '4 requests open',
    kpis: [
      { label: 'Assets in Library', value: '312', note: '18 added this month', tone: 'foreground' },
      { label: 'Open Design Requests', value: '4', note: '1 overdue', tone: 'foreground' },
      { label: 'Avg Turnaround', value: '3.2 days', note: '-0.8 days', tone: 'primary' },
      { label: 'Guideline Compliance', value: '88%', note: 'of audited touchpoints', tone: 'primary' },
    ],
    breakdownTitle: 'Asset library by type',
    breakdownNote: '312 approved assets under version control',
    breakdownUnit: 'assets',
    breakdown: [
      { label: 'Social & campaign creative', count: 128, pct: 41 },
      { label: 'Product screenshots & UI', count: 84, pct: 27 },
      { label: 'Logos, marks & wordmarks', count: 62, pct: 20 },
      { label: 'Presentation & document templates', count: 38, pct: 12 },
    ],
    itemsTitle: 'Design requests in the queue',
    itemsNote: 'Incoming work from other departments',
    items: [
      { id: 'BRD-341', title: 'Sales one-pager refresh - logistics vertical', meta: 'Requested by Sales · Print + PDF', owner: 'Lavanya Rathi', status: 'Overdue', tone: 'destructive', age: '9 days' },
      { id: 'BRD-336', title: 'Webinar series key visual set', meta: 'Requested by Marketing · 6 formats', owner: 'Charan Billava', status: 'In design', tone: 'primary', age: '3 days' },
      { id: 'BRD-330', title: 'Careers page photography direction', meta: 'Requested by HR · Shoot brief', owner: 'Lavanya Rathi', status: 'Awaiting brief', tone: 'warning', age: '6 days' },
      { id: 'BRD-322', title: 'Dashboard icon set - second pass', meta: 'Requested by Developers · 24 icons', owner: 'Charan Billava', status: 'In review', tone: 'muted', age: '2 days' },
    ],
    logTitle: 'Recently published',
    log: [
      { title: 'Brand guidelines v2.1', detail: 'Colour + typography update', by: 'Lavanya Rathi', when: 'Last week', status: 'Published' },
      { title: 'Q3 pitch deck template', detail: '18 slides · light and dark', by: 'Charan Billava', when: '2 weeks ago', status: 'Published' },
      { title: 'Email signature generator', detail: 'Rolled out to all staff', by: 'Lavanya Rathi', when: '3 weeks ago', status: 'Published' },
    ],
  },

  production: {
    tagline: 'Delivery schedule, capacity, and quality across active jobs',
    badge: '6 jobs in flight',
    kpis: [
      { label: 'On-time Delivery', value: '91%', note: '+4 pts MoM', tone: 'primary' },
      { label: 'Jobs In Flight', value: '6', note: '2 due this week', tone: 'foreground' },
      { label: 'Capacity Used', value: '78%', note: 'of available hours', tone: 'foreground' },
      { label: 'Rework Rate', value: '4.2%', note: '-1.1 pts', tone: 'primary' },
    ],
    breakdownTitle: 'Active jobs by stage',
    breakdownNote: '6 client jobs currently in production',
    breakdownUnit: 'jobs',
    breakdown: [
      { label: 'Build / execution', count: 3, pct: 50 },
      { label: 'Quality check', count: 1, pct: 17 },
      { label: 'Client review', count: 1, pct: 17 },
      { label: 'Ready to ship', count: 1, pct: 16 },
    ],
    itemsTitle: 'Jobs on the floor',
    itemsNote: 'Current status and delivery date',
    items: [
      { id: 'JOB-508', title: 'Kotak Retail - onboarding video set', meta: 'Build · due Thu', owner: 'Debashish Das', status: 'On track', tone: 'primary', age: '4 days in' },
      { id: 'JOB-503', title: 'Aakash Diagnostics - training modules', meta: 'Quality check · due Fri', owner: 'Tilottama Paramanik', status: 'At risk', tone: 'warning', age: '9 days in' },
      { id: 'JOB-497', title: 'Vertex Media - campaign film cut 3', meta: 'Client review · due next Mon', owner: 'Debashish Das', status: 'Awaiting client', tone: 'muted', age: '2 weeks in' },
      { id: 'JOB-491', title: 'Bharat Textiles - product catalogue', meta: 'Ready to ship · due today', owner: 'Tilottama Paramanik', status: 'Ready', tone: 'primary', age: '3 weeks in' },
    ],
    logTitle: 'Recently delivered',
    log: [
      { title: 'Meridian Hotels - brand film', detail: 'Delivered 2 days early', by: 'Debashish Das', when: 'Last week', status: 'On time' },
      { title: 'Orbit Foods - packaging shoot', detail: 'Delivered on schedule', by: 'Tilottama Paramanik', when: '2 weeks ago', status: 'On time' },
      { title: 'Sundaram Logistics - explainer', detail: 'Delivered 3 days late (scope change)', by: 'Debashish Das', when: '3 weeks ago', status: 'Late' },
    ],
  },
};

export const DEMO_DEPT_IDS = Object.keys(DEPT_DEMO);
