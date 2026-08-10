// Local, in-memory demo data for the HR dashboard. Nothing here touches the
// real backend — every HR page reads and mutates these arrays directly so
// the whole HR module is fully clickable without needing ATS/email/
// resume-parsing infrastructure that doesn't exist yet. See
// docs/BACKEND_WORKFLOW.md §5 for what wiring this to a real API would take.

export const employees = [
  { id: 'E-01', name: 'Rahul Sen', designation: 'Engineering Manager', department: 'Engineering', email: 'rahul.sen@futeservices.com', phone: '+91 90011 22334', joiningDate: '2022-03-14', manager: 'Founder', status: 'Active', photo: 'RS' },
  { id: 'E-02', name: 'Payal Shah', designation: 'HR Manager', department: 'Human Resources', email: 'payal.shah@futeservices.com', phone: '+91 90022 33445', joiningDate: '2021-11-02', manager: 'Founder', status: 'Active', photo: 'PS' },
  { id: 'E-03', name: 'Sneha Iyer', designation: 'HR Executive', department: 'Human Resources', email: 'sneha.iyer@futeservices.com', phone: '+91 90033 44556', joiningDate: '2023-06-19', manager: 'Payal Shah', status: 'Active', photo: 'SI' },
  { id: 'E-04', name: 'Devansh Gupta', designation: 'Mobile Engineer', department: 'Engineering', email: 'devansh.g@futeservices.com', phone: '+91 90044 55667', joiningDate: '2026-07-01', manager: 'Rahul Sen', status: 'Active', photo: 'DG' },
  { id: 'E-05', name: 'Meera Pillai', designation: 'IT Support', department: 'IT', email: 'system.meera@futeservices.com', phone: '+91 90055 66778', joiningDate: '2023-01-10', manager: 'Founder', status: 'On Leave', photo: 'MP' },
  { id: 'E-06', name: 'Arjun Verma', designation: 'DevOps Manager', department: 'Engineering', email: 'arjun.verma@futeservices.com', phone: '+91 90066 77889', joiningDate: '2020-09-23', manager: 'Founder', status: 'Active', photo: 'AV' },
];

// Bank details are shown only inside the employee profile drawer, never in
// the directory list/cards — same principle as the login page's honest
// disabled states: don't surface sensitive data anywhere it isn't asked for.
export const bankDetails = {
  'E-01': { accountHolder: 'Rahul Sen', bankName: 'HDFC Bank', accountNumber: 'XXXX XXXX 4821', ifsc: 'HDFC0001234', branch: 'Koramangala, Bengaluru' },
  'E-02': { accountHolder: 'Payal Shah', bankName: 'ICICI Bank', accountNumber: 'XXXX XXXX 7790', ifsc: 'ICIC0002211', branch: 'Andheri West, Mumbai' },
  'E-03': { accountHolder: 'Sneha Iyer', bankName: 'Axis Bank', accountNumber: 'XXXX XXXX 3305', ifsc: 'UTIB0001122', branch: 'Anna Nagar, Chennai' },
  'E-04': { accountHolder: 'Devansh Gupta', bankName: 'HDFC Bank', accountNumber: 'XXXX XXXX 6642', ifsc: 'HDFC0004567', branch: 'HSR Layout, Bengaluru' },
  'E-05': { accountHolder: 'Meera Pillai', bankName: 'SBI', accountNumber: 'XXXX XXXX 1187', ifsc: 'SBIN0009988', branch: 'Kochi Main' },
  'E-06': { accountHolder: 'Arjun Verma', bankName: 'Kotak Mahindra Bank', accountNumber: 'XXXX XXXX 9034', ifsc: 'KKBK0003344', branch: 'Gachibowli, Hyderabad' },
};

export const CANDIDATE_STAGES = [
  'Applied',
  'Screening',
  'HR Round',
  'Technical Round',
  'Final Interview',
  'Offer Sent',
  'Joined',
  'Rejected',
];

export const RESUME_SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Monster', 'Internal Portal', 'Referral', 'Manual Upload'];

export const candidates = [
  { id: 'C-1001', name: 'Ananya Rao', email: 'ananya.rao@mail.com', phone: '+91 98765 43210', location: 'Bengaluru', skills: ['React', 'Node.js', 'TypeScript'], experience: '4 yrs', education: 'B.Tech CSE, RVCE', expectedSalary: '₹18 LPA', currentCompany: 'Zeta Labs', portfolio: 'ananyarao.dev', source: 'LinkedIn', stage: 'Technical Round', appliedFor: 'Senior Frontend Engineer', appliedOn: '2026-07-18' },
  { id: 'C-1002', name: 'Rohit Malhotra', email: 'rohit.m@mail.com', phone: '+91 91234 56780', location: 'Pune', skills: ['Java', 'Spring Boot', 'AWS'], experience: '6 yrs', education: 'B.E. IT, COEP', expectedSalary: '₹24 LPA', currentCompany: 'Infosys', portfolio: '', source: 'Naukri', stage: 'HR Round', appliedFor: 'Backend Lead', appliedOn: '2026-07-20' },
  { id: 'C-1003', name: 'Priya Nair', email: 'priya.nair@mail.com', phone: '+91 99887 66554', location: 'Kochi', skills: ['Figma', 'UX Research', 'Design Systems'], experience: '3 yrs', education: 'NID Ahmedabad', expectedSalary: '₹14 LPA', currentCompany: 'Freelance', portfolio: 'behance.net/priyanair', source: 'Referral', stage: 'Offer Sent', appliedFor: 'Product Designer', appliedOn: '2026-07-10' },
  { id: 'C-1004', name: 'Karan Mehta', email: 'karan.mehta@mail.com', phone: '+91 90000 11122', location: 'Delhi', skills: ['Python', 'Django', 'PostgreSQL'], experience: '2 yrs', education: 'B.Tech, DTU', expectedSalary: '₹10 LPA', currentCompany: 'Startup Nest', portfolio: '', source: 'Indeed', stage: 'Screening', appliedFor: 'Backend Developer', appliedOn: '2026-08-01' },
  { id: 'C-1005', name: 'Sneha Iyer', email: 'sneha.iyer@mail.com', phone: '+91 98123 45670', location: 'Chennai', skills: ['HR Ops', 'Payroll', 'Compliance'], experience: '5 yrs', education: 'MBA HR, Loyola', expectedSalary: '₹12 LPA', currentCompany: 'Wipro', portfolio: '', source: 'Internal Portal', stage: 'Applied', appliedFor: 'HR Executive', appliedOn: '2026-08-03' },
  { id: 'C-1006', name: 'Arjun Verma', email: 'arjun.verma@mail.com', phone: '+91 97654 32109', location: 'Hyderabad', skills: ['DevOps', 'Kubernetes', 'CI/CD'], experience: '7 yrs', education: 'B.Tech, IIIT-H', expectedSalary: '₹28 LPA', currentCompany: 'Amazon', portfolio: 'github.com/arjunv', source: 'Referral', stage: 'Final Interview', appliedFor: 'DevOps Manager', appliedOn: '2026-07-15' },
  { id: 'C-1007', name: 'Meera Pillai', email: 'meera.p@mail.com', phone: '+91 96543 21098', location: 'Mumbai', skills: ['Sales', 'CRM', 'Negotiation'], experience: '3 yrs', education: 'BBA, NMIMS', expectedSalary: '₹9 LPA', currentCompany: 'HDFC', portfolio: '', source: 'Monster', stage: 'Rejected', appliedFor: 'Sales Associate', appliedOn: '2026-07-05' },
  { id: 'C-1008', name: 'Devansh Gupta', email: 'devansh.g@mail.com', phone: '+91 95432 10987', location: 'Bengaluru', skills: ['React Native', 'Flutter'], experience: '2 yrs', education: 'B.Tech, PES University', expectedSalary: '₹11 LPA', currentCompany: 'Swiggy', portfolio: 'devansh.io', source: 'Manual Upload', stage: 'Joined', appliedFor: 'Mobile Engineer', appliedOn: '2026-06-28' },
];

export const INTERVIEW_TYPES = ['HR', 'Technical', 'Manager', 'Final Round'];
export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'];

export const interviews = [
  { id: 'IV-501', candidateId: 'C-1001', candidate: 'Ananya Rao', type: 'Technical', interviewer: 'Rahul Sen', date: '2026-08-07', time: '11:00 AM', link: 'meet.fute.com/iv-501', location: 'Remote', status: 'Scheduled', notes: 'Focus on system design.' },
  { id: 'IV-502', candidateId: 'C-1002', candidate: 'Rohit Malhotra', type: 'HR', interviewer: 'Payal Shah', date: '2026-08-06', time: '03:00 PM', link: '', location: 'Conference Room B', status: 'Scheduled', notes: 'Discuss notice period.' },
  { id: 'IV-503', candidateId: 'C-1003', candidate: 'Priya Nair', type: 'Final Round', interviewer: 'Founder', date: '2026-08-05', time: '05:00 PM', link: 'meet.fute.com/iv-503', location: 'Remote', status: 'Completed', notes: 'Strong portfolio.' },
  { id: 'IV-504', candidateId: 'C-1006', candidate: 'Arjun Verma', type: 'Manager', interviewer: 'Payal Shah', date: '2026-08-08', time: '10:30 AM', link: 'meet.fute.com/iv-504', location: 'Remote', status: 'Scheduled', notes: '' },
  { id: 'IV-505', candidateId: 'C-1007', candidate: 'Meera Pillai', type: 'HR', interviewer: 'Payal Shah', date: '2026-07-30', time: '02:00 PM', link: '', location: 'Conference Room A', status: 'Cancelled', notes: 'Candidate withdrew.' },
  { id: 'IV-506', candidateId: 'C-1004', candidate: 'Karan Mehta', type: 'Technical', interviewer: 'Rahul Sen', date: '2026-08-09', time: '01:00 PM', link: 'meet.fute.com/iv-506', location: 'Remote', status: 'Rescheduled', notes: 'Moved from Aug 4.' },
];

export const meetings = [
  { id: 'MT-201', title: 'Weekly HR Sync', type: 'HR Meeting', agenda: 'Review open positions and pipeline health.', participants: ['Payal Shah', 'Rahul Sen', 'Sneha Iyer'], date: '2026-08-06', time: '09:30 AM', notes: '' },
  { id: 'MT-202', title: 'Offer discussion — Priya Nair', type: 'Candidate Meeting', agenda: 'Finalize compensation before sending offer.', participants: ['Payal Shah', 'Founder'], date: '2026-08-06', time: '04:00 PM', notes: 'Budget approved up to ₹15 LPA.' },
  { id: 'MT-203', title: 'Q3 Hiring Plan', type: 'Team Meeting', agenda: 'Headcount planning for Q3.', participants: ['Founder', 'Payal Shah', 'Department Managers'], date: '2026-08-10', time: '11:00 AM', notes: '' },
];

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'Work From Home'];

// yyyy-mm-dd -> status, per employee id, for the current month demo view
export const attendanceRecords = [
  { employeeId: 'E-01', date: '2026-08-01', status: 'Present', checkIn: '09:12', checkOut: '18:30' },
  { employeeId: 'E-01', date: '2026-08-02', status: 'Present', checkIn: '09:05', checkOut: '18:20' },
  { employeeId: 'E-01', date: '2026-08-03', status: 'Work From Home', checkIn: '09:30', checkOut: '18:00' },
  { employeeId: 'E-01', date: '2026-08-04', status: 'Late', checkIn: '10:45', checkOut: '19:00' },
  { employeeId: 'E-01', date: '2026-08-05', status: 'Present', checkIn: '09:00', checkOut: '18:15' },
  { employeeId: 'E-02', date: '2026-08-01', status: 'Present', checkIn: '09:00', checkOut: '18:00' },
  { employeeId: 'E-02', date: '2026-08-02', status: 'Present', checkIn: '08:55', checkOut: '18:10' },
  { employeeId: 'E-02', date: '2026-08-03', status: 'Half Day', checkIn: '09:00', checkOut: '13:00' },
  { employeeId: 'E-02', date: '2026-08-04', status: 'Present', checkIn: '09:10', checkOut: '18:05' },
  { employeeId: 'E-02', date: '2026-08-05', status: 'Present', checkIn: '09:02', checkOut: '18:25' },
  { employeeId: 'E-03', date: '2026-08-01', status: 'Present', checkIn: '09:20', checkOut: '18:00' },
  { employeeId: 'E-03', date: '2026-08-02', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: 'E-03', date: '2026-08-03', status: 'Present', checkIn: '09:15', checkOut: '18:10' },
  { employeeId: 'E-03', date: '2026-08-04', status: 'Present', checkIn: '09:10', checkOut: '18:00' },
  { employeeId: 'E-03', date: '2026-08-05', status: 'Work From Home', checkIn: '09:00', checkOut: '17:45' },
  { employeeId: 'E-05', date: '2026-08-01', status: 'Present', checkIn: '09:30', checkOut: '18:00' },
  { employeeId: 'E-05', date: '2026-08-02', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: 'E-05', date: '2026-08-03', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: 'E-05', date: '2026-08-04', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: 'E-05', date: '2026-08-05', status: 'Absent', checkIn: '-', checkOut: '-' },
];

export const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave'];
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const leaveRequests = [
  { id: 'LV-301', employeeId: 'E-03', employee: 'Sneha Iyer', type: 'Casual Leave', from: '2026-08-12', to: '2026-08-13', days: 2, reason: 'Family function', status: 'Pending' },
  { id: 'LV-302', employeeId: 'E-04', employee: 'Devansh Gupta', type: 'Sick Leave', from: '2026-08-06', to: '2026-08-06', days: 1, reason: 'Fever', status: 'Approved' },
  { id: 'LV-303', employeeId: 'E-05', employee: 'Meera Pillai', type: 'Earned Leave', from: '2026-08-01', to: '2026-08-05', days: 5, reason: 'Personal travel', status: 'Approved' },
  { id: 'LV-304', employeeId: 'E-01', employee: 'Rahul Sen', type: 'Casual Leave', from: '2026-08-20', to: '2026-08-20', days: 1, reason: 'Personal work', status: 'Pending' },
  { id: 'LV-305', employeeId: 'E-06', employee: 'Arjun Verma', type: 'Earned Leave', from: '2026-08-15', to: '2026-08-18', days: 4, reason: 'Vacation', status: 'Rejected' },
];

export const leaveBalances = [
  { employeeId: 'E-01', casual: 6, sick: 5, earned: 10 },
  { employeeId: 'E-02', casual: 8, sick: 6, earned: 12 },
  { employeeId: 'E-03', casual: 4, sick: 3, earned: 8 },
  { employeeId: 'E-04', casual: 9, sick: 6, earned: 12 },
  { employeeId: 'E-05', casual: 2, sick: 1, earned: 5 },
  { employeeId: 'E-06', casual: 5, sick: 4, earned: 7 },
];

export const notifications = [
  { id: 'N-1', type: 'Interview Scheduled', text: 'Technical round scheduled with Ananya Rao — Aug 7, 11:00 AM', time: '10 min ago', unread: true },
  { id: 'N-2', type: 'Leave Request', text: 'Sneha Iyer requested Casual Leave (Aug 12-13)', time: '32 min ago', unread: true },
  { id: 'N-3', type: 'New Candidate', text: 'Karan Mehta applied for Backend Developer', time: '2 hr ago', unread: true },
  { id: 'N-4', type: 'Employee Joined', text: 'Devansh Gupta joined as Mobile Engineer', time: '1 day ago', unread: false },
  { id: 'N-5', type: 'Task Assigned', text: 'You were assigned "Update employee handbook"', time: '2 days ago', unread: false },
  { id: 'N-6', type: 'Offer Letter', text: 'Offer sent to Priya Nair for Product Designer', time: '3 days ago', unread: false },
];

export const emails = {
  inbox: [
    { id: 'EM-1', from: 'ananya.rao@mail.com', subject: 'Re: Technical Round Confirmation', preview: 'Thanks, I confirm 11 AM on Aug 7 works for me...', time: '9:14 AM', unread: true, thread: [
      { from: 'Payal Shah', to: 'ananya.rao@mail.com', body: 'Hi Ananya, confirming your technical round on Aug 7, 11 AM with Rahul Sen.', time: 'Aug 5, 4:02 PM' },
      { from: 'Ananya Rao', to: 'HR', body: 'Thanks, I confirm 11 AM on Aug 7 works for me. Looking forward to it!', time: 'Aug 6, 9:14 AM' },
    ] },
    { id: 'EM-2', from: 'careers@naukri.com', subject: 'New application: Backend Developer', preview: 'Karan Mehta has applied for Backend Developer role...', time: 'Yesterday', unread: true, thread: [
      { from: 'Naukri', to: 'HR', body: 'Karan Mehta has applied for the Backend Developer role. Resume attached.', time: 'Aug 5, 6:40 PM' },
    ] },
    { id: 'EM-3', from: 'rohit.m@mail.com', subject: 'Notice period query', preview: 'I wanted to check if a 30-day notice period is acceptable...', time: '2 days ago', unread: false, thread: [
      { from: 'Rohit Malhotra', to: 'HR', body: 'I wanted to check if a 30-day notice period is acceptable for the Backend Lead role.', time: 'Aug 4, 11:20 AM' },
    ] },
  ],
  sent: [
    { id: 'ES-1', to: 'priya.nair@mail.com', subject: 'Offer Letter — Product Designer', preview: 'We are excited to offer you the position of...', time: '3 days ago' },
    { id: 'ES-2', to: 'ananya.rao@mail.com', subject: 'Technical Round Confirmation', preview: 'Confirming your technical round on Aug 7...', time: 'Aug 5, 4:02 PM' },
  ],
  drafts: [
    { id: 'ED-1', to: 'arjun.verma@mail.com', subject: 'Final round feedback pending', preview: 'Hi Arjun, we wanted to update you on your final round...', time: 'Aug 5' },
  ],
  templates: [
    { id: 'ET-1', name: 'Interview Confirmation', subject: 'Your interview is confirmed' },
    { id: 'ET-2', name: 'Offer Letter', subject: 'Offer of Employment — Fute Services' },
    { id: 'ET-3', name: 'Rejection — Post Interview', subject: 'Update on your application' },
  ],
};

export const feedbackEntries = [
  { id: 'FB-1', candidate: 'Priya Nair', interviewId: 'IV-503', interviewer: 'Founder', rating: 5, recommendation: 'Hire', comments: 'Excellent design sense, strong portfolio, great communication.' },
  { id: 'FB-2', candidate: 'Meera Pillai', interviewId: 'IV-505', interviewer: 'Payal Shah', rating: 2, recommendation: 'Reject', comments: 'Candidate withdrew before the round could be completed.' },
  { id: 'FB-3', candidate: 'Devansh Gupta', interviewId: 'IV-500', interviewer: 'Rahul Sen', rating: 4, recommendation: 'Hire', comments: 'Solid React Native fundamentals, good problem solving.' },
];

export const activityLogs = [
  { id: 'AL-1', user: 'Payal Shah', action: 'Approved leave request LV-302', time: '2026-08-05 18:22', ip: '10.0.0.14', device: 'Chrome / Windows' },
  { id: 'AL-2', user: 'Sneha Iyer', action: 'Uploaded resume for Karan Mehta', time: '2026-08-05 16:03', ip: '10.0.0.22', device: 'Chrome / macOS' },
  { id: 'AL-3', user: 'Rahul Sen', action: 'Scheduled interview IV-506', time: '2026-08-05 14:47', ip: '10.0.0.31', device: 'Edge / Windows' },
  { id: 'AL-4', user: 'Payal Shah', action: 'Sent offer letter to Priya Nair', time: '2026-08-03 12:10', ip: '10.0.0.14', device: 'Chrome / Windows' },
  { id: 'AL-5', user: 'Founder', action: 'Logged in', time: '2026-08-06 08:55', ip: '10.0.0.5', device: 'Safari / macOS' },
  { id: 'AL-6', user: 'Sneha Iyer', action: 'Updated attendance for E-03', time: '2026-08-05 09:31', ip: '10.0.0.22', device: 'Chrome / macOS' },
];

export const hiringTrend = [12, 18, 15, 22, 19, 27, 24, 30]; // last 8 weeks, offers made
export const attendanceTrend = [92, 89, 94, 90, 96, 91, 93, 95]; // last 8 weeks, % present

export const departmentDistribution = [
  { department: 'Engineering', count: 14, color: '#e86024' },
  { department: 'Human Resources', count: 4, color: '#f59e0b' },
  { department: 'IT', count: 5, color: '#d97706' },
  { department: 'Sales', count: 6, color: '#fb923c' },
];

export const departmentPerformance = [
  { department: 'Engineering', score: 88 },
  { department: 'Human Resources', score: 92 },
  { department: 'IT', score: 84 },
  { department: 'Sales', score: 79 },
];

export const openJobs = [
  { id: 'JB-1', title: 'Senior Frontend Engineer', department: 'Engineering', applicants: 24, openSince: '2026-07-01' },
  { id: 'JB-2', title: 'Backend Lead', department: 'Engineering', applicants: 18, openSince: '2026-07-10' },
  { id: 'JB-3', title: 'Product Designer', department: 'Design', applicants: 12, openSince: '2026-06-20' },
  { id: 'JB-4', title: 'HR Executive', department: 'Human Resources', applicants: 9, openSince: '2026-07-28' },
];
