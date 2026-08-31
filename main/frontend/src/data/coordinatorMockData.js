// Local, in-memory demo data for the Project Coordinator role - task
// assignment/tracking isn't HR's job, so it lives separately from
// hrMockData.js even though the coordinator still assigns tasks to the
// same staff directory HR maintains (see `employees` in hrMockData.js).

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

// Projects the coordinator runs. `members` are names from hrMockData's
// `employees` so the two directories stay consistent.
export const PROJECT_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Completed'];

export const projects = [
  {
    id: 'PRJ-01',
    name: 'Client Portal Redesign',
    client: 'Northwind Retail',
    status: 'On Track',
    progress: 72,
    startDate: '2026-06-01',
    dueDate: '2026-09-15',
    members: ['Akila S', 'Charan Billava', 'Yogesh Kumar'],
    figma: 'figma.com/file/northwind-portal',
    repo: 'github.com/fute/northwind-portal',
  },
  {
    id: 'PRJ-02',
    name: 'Mobile App v2',
    client: 'Internal',
    status: 'At Risk',
    progress: 45,
    startDate: '2026-05-12',
    dueDate: '2026-08-30',
    members: ['Yogesh Kumar', 'Srinivasan Neelakandan'],
    figma: 'figma.com/file/fute-mobile-v2',
    repo: 'github.com/fute/mobile-app',
  },
  {
    id: 'PRJ-03',
    name: 'Infra Migration to K8s',
    client: 'Internal',
    status: 'On Track',
    progress: 88,
    startDate: '2026-04-20',
    dueDate: '2026-08-20',
    members: ['Srinivasan Neelakandan', 'Akila S'],
    figma: '',
    repo: 'github.com/fute/infra-k8s',
  },
  {
    id: 'PRJ-04',
    name: 'HR Onboarding Automation',
    client: 'Internal',
    status: 'Delayed',
    progress: 30,
    startDate: '2026-06-15',
    dueDate: '2026-08-10',
    members: ['Sangeetha KS', 'Trupthi S'],
    figma: 'figma.com/file/hr-onboarding',
    repo: '',
  },
];

export const tasks = [
  { id: 'TK-901', projectId: 'PRJ-01', title: 'Build responsive dashboard grid', assignee: 'Yogesh Kumar', priority: 'High', status: 'In Progress', dueDate: '2026-08-07', duration: '3 days', comments: 2, attachments: 0, figma: 'figma.com/file/northwind-portal?node=142-88', pr: 'github.com/fute/northwind-portal/pull/214' },
  { id: 'TK-902', projectId: 'PRJ-01', title: 'Design settings page mockups', assignee: 'Charan Billava', priority: 'High', status: 'Pending', dueDate: '2026-08-06', duration: '2 days', comments: 1, attachments: 1, figma: 'figma.com/file/northwind-portal?node=201-14', pr: '' },
  { id: 'TK-903', projectId: 'PRJ-02', title: 'Fix push notification crash on iOS', assignee: 'Yogesh Kumar', priority: 'High', status: 'Pending', dueDate: '2026-08-10', duration: '1 day', comments: 0, attachments: 0, figma: '', pr: 'github.com/fute/mobile-app/pull/57' },
  { id: 'TK-904', projectId: 'PRJ-03', title: 'Write Helm charts for staging', assignee: 'Srinivasan Neelakandan', priority: 'Medium', status: 'Completed', dueDate: '2026-07-28', duration: '4 days', comments: 3, attachments: 2, figma: '', pr: 'github.com/fute/infra-k8s/pull/88' },
  { id: 'TK-905', projectId: 'PRJ-04', title: 'Map onboarding checklist to HRMS fields', assignee: 'Sangeetha KS', priority: 'Medium', status: 'In Progress', dueDate: '2026-08-08', duration: '5 days', comments: 1, attachments: 0, figma: 'figma.com/file/hr-onboarding?node=8-2', pr: '' },
  { id: 'TK-906', projectId: 'PRJ-02', title: 'Update app icon set for dark mode', assignee: 'Charan Billava', priority: 'Low', status: 'Pending', dueDate: '2026-08-14', duration: '2 days', comments: 0, attachments: 3, figma: 'figma.com/file/fute-mobile-v2?node=33-7', pr: '' },
];
