// Local, in-memory demo data for the Project Coordinator role — task
// assignment/tracking isn't HR's job, so it lives separately from
// hrMockData.js even though the coordinator still assigns tasks to the
// same staff directory HR maintains (see `employees` in hrMockData.js).

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

export const tasks = [
  { id: 'TK-901', title: 'Post JD for Backend Lead', assignee: 'Sneha Iyer', priority: 'High', status: 'In Progress', dueDate: '2026-08-07', comments: 2, attachments: 0 },
  { id: 'TK-902', title: 'Prepare offer letter — Priya Nair', assignee: 'Payal Shah', priority: 'High', status: 'Pending', dueDate: '2026-08-06', comments: 1, attachments: 1 },
  { id: 'TK-903', title: 'Schedule Q3 hiring review', assignee: 'Payal Shah', priority: 'Medium', status: 'Pending', dueDate: '2026-08-10', comments: 0, attachments: 0 },
  { id: 'TK-904', title: 'Update employee handbook', assignee: 'Sneha Iyer', priority: 'Low', status: 'Completed', dueDate: '2026-07-28', comments: 3, attachments: 2 },
  { id: 'TK-905', title: 'Verify Arjun Verma references', assignee: 'Rahul Sen', priority: 'Medium', status: 'In Progress', dueDate: '2026-08-08', comments: 1, attachments: 0 },
];
