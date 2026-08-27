// Local, in-memory demo data for the HR dashboard. Nothing here touches the
// real backend — every HR page reads and mutates these arrays directly so
// the whole HR module is fully clickable without needing ATS/email/
// resume-parsing infrastructure that doesn't exist yet. See
// docs/BACKEND_WORKFLOW.md §5 for what wiring this to a real API would take.

// Real company roster (replaces the earlier six-person illustrative list).
// No phone/joiningDate on file for these yet, so those fields are left out
// rather than invented — Directory.jsx already renders blank for missing
// values instead of a placeholder.
export const employees = [
  { id: '10068', name: 'Nitish Kumar Sharma', designation: 'TL', department: 'Production', email: 'bangalore.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'NS' },
  { id: '10163', name: 'Pradeep Kumar', designation: 'SR 3D', department: 'Production', email: 'team1.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'PK' },
  { id: '10188', name: 'Kanhu', designation: 'Model', department: 'Production', email: 'team8.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'KA' },
  { id: '10191', name: 'Abhinav Rai', designation: 'Model', department: 'Production', email: 'team4.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'AR' },
  { id: '10205', name: 'Mayank', designation: 'TL', department: 'Production', email: 'team11.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'MA' },
  { id: '10208', name: 'Himanshu', designation: '3D', department: 'Production', email: 'team15.fute@gmail.com', manager: 'Mayank (TL)', status: 'Active', photo: 'HI' },
  { id: '10209', name: 'Kalyani', designation: 'TL -Plan', department: 'Production', email: 'team6.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'KA' },
  { id: '10214', name: 'Vipin', designation: 'SR 3D', department: 'Production', email: 'team13.fute@gmail.com', manager: 'Mayank (TL)', status: 'Active', photo: 'VI' },
  { id: '10230', name: 'Amit Gomasta', designation: 'compositor', department: 'Production', email: 'post6.fute@gmail.com', manager: '', status: 'Active', photo: 'AG' },
  { id: '10244', name: 'Anushtha Saini', designation: 'Interior', department: 'Production', email: 'team9.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'AS' },
  { id: '10249', name: 'Debashish Das', designation: 'Floor plan', department: 'Production', email: 'team23.fute@gmail.com', manager: 'Kalyani (TL-Plan)', status: 'Active', photo: 'DD' },
  { id: '10274', name: 'Hridesh Kumar', designation: 'POST', department: 'Production', email: 'post9.fute@gmail.com', manager: '', status: 'Active', photo: 'HK' },
  { id: '10280', name: 'Sonali Das', designation: 'Plans', department: 'Production', email: 'team24.fute@gmail.com', manager: 'Kalyani (TL-Plan)', status: 'Active', photo: 'SD' },
  { id: '10286', name: 'Chetan Khirekar', designation: 'Interior', department: 'Production', email: 'team27.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'CK' },
  { id: '10288', name: 'Tilottama Paramanik', designation: 'Floor plan', department: 'Production', email: 'team29.fute@gmail.com', manager: 'Kalyani (TL-Plan)', status: 'Active', photo: 'TP' },
  { id: '10292', name: 'Mohanprabu', designation: 'IT', department: 'Admin/Ops', email: 'tech1.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'MO' },
  { id: '10299', name: 'Mohit', designation: 'SR 3D', department: 'Production', email: 'team32.fute@gmail.com', manager: 'Nitish (TL)', status: 'Active', photo: 'MO' },
  { id: '10301', name: 'Priyal Chorge', designation: 'post-Sr', department: 'Production', email: 'post10.fute@gmail.com', manager: '', status: 'Active', photo: 'PC' },
  { id: '10303', name: 'Akila S', designation: 'Developer', department: 'Production', email: 'fute.fwd@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'AS' },
  { id: '10310', name: 'Prathiti A C', designation: 'Proj-Cord', department: 'Admin/Ops', email: 'project8.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'PA' },
  { id: '10319', name: 'Srinivasan Neelakandan', designation: 'Developer', department: 'Production', email: 'fute.fwd2@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SN' },
  { id: '10323', name: 'Jyothi Ranjan Jena', designation: 'Plan', department: 'Production', email: 'team33.fute@gmail.com', manager: 'Kalyani (TL-Plan)', status: 'Active', photo: 'JJ' },
  { id: '10331', name: 'Sangeetha KS', designation: 'HR intern', department: 'Admin/Ops', email: 'hr.fute3@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SK' },
  { id: '10332', name: 'Trupthi S', designation: 'HR intern', department: 'Admin/Ops', email: 'hr.fute3@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'TS' },
  { id: '10333', name: 'Lavanya Yaligar', designation: 'Project-Coordinator', department: 'Production', email: 'int2.fute@gmail.com', manager: 'Mrs. Soma Rathish', status: 'Active', photo: 'LY' },
  { id: '10334', name: 'Sai Charan', designation: 'Animation Film Design Intern', department: 'Production', email: 'int7.fute@gmail.com', manager: 'Mrs. Soma Rathish', status: 'Active', photo: 'SC' },
  { id: '10336', name: 'Shivani AS', designation: 'Inside Sales Executive', department: 'Sales', email: 'Sales2.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SA' },
  { id: '10337', name: 'Yogesh Kumar', designation: 'Full stack developer intern', department: 'Software', email: 'int6.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'YK' },
  { id: '10338', name: 'Kumar Gautam', designation: 'Full stack developer intern', department: 'Software', email: 'int8.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'KG' },
  { id: '10339', name: 'Aabhya Gupta', designation: 'Project coordinator', department: 'Production', email: 'fute.cordination2@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'AG' },
  { id: '10340', name: 'Sofiya K N', designation: 'Project coordinator', department: 'Production', email: 'project9.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SK' },
  { id: '10341', name: 'Kapil Chauhan', designation: '3D Visualiser', department: 'Production', email: 'team34.fute@gmail.com', manager: 'Nithish (TL)', status: 'Active', photo: 'KC' },
  { id: '10342', name: 'Sayantani Mukherjee', designation: 'Project coordinator', department: 'Production', email: 'Project1.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SM' },
  { id: '10344', name: 'Saubhagya Anubhav', designation: 'Full stack developer intern', department: 'Software', email: 'int11.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'SA' },
  { id: '10347', name: 'Nesamanikandan', designation: 'System Administrator', department: 'IT', email: 'tech2.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'NE' },
  { id: '10348', name: 'Puja Thakur', designation: 'Business Development Executive', department: 'Sales', email: 'sales3.fute@gmail.com', manager: 'Shivani', status: 'Active', photo: 'PT' },
  { id: '10349', name: 'Ann Mary Anu', designation: 'Project coordinator', department: 'Production', email: 'project8.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'AA' },
  { id: '10350', name: 'Lavanya Rathi', designation: 'Visual Communication and Brand Identity Executive', department: 'Marketing', email: 'branding.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'LR' },
  { id: '10351', name: 'Charan Billava', designation: 'UI/UX intern', department: 'Software', email: 'int4.fute@gmail.com', manager: 'Ms. Payel Saha', status: 'Active', photo: 'CB' },
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
  'Offer Declined',
  'Rejected',
  'On Hold',
];

export const RESUME_SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Monster', 'Internal Portal', 'Referral', 'Manual Upload', 'Company Website/Career Page'];

// Only relevant when stage is 'Rejected' or 'Offer Declined' — a structured
// list (not free text) so HR can report on "why we lose candidates" later.
export const REJECTION_REASONS = [
  'Salary Mismatch',
  'Skill Gap',
  'Culture Fit',
  'Position Closed/On Hold',
  'Candidate Withdrew',
  'Better Candidate Selected',
  'Notice Period Too Long',
  'Other',
];

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
  { id: 'IV-501', candidateId: 'C-1001', candidate: 'Ananya Rao', type: 'Technical', interviewer: 'Nesamanikandan', date: '2026-08-07', time: '11:00 AM', link: 'meet.fute.com/iv-501', location: 'Remote', status: 'Scheduled', notes: 'Focus on system design.' },
  { id: 'IV-502', candidateId: 'C-1002', candidate: 'Rohit Malhotra', type: 'HR', interviewer: 'Ms. Payel Saha', date: '2026-08-06', time: '03:00 PM', link: '', location: 'Conference Room B', status: 'Scheduled', notes: 'Discuss notice period.' },
  { id: 'IV-503', candidateId: 'C-1003', candidate: 'Priya Nair', type: 'Final Round', interviewer: 'Founder', date: '2026-08-05', time: '05:00 PM', link: 'meet.fute.com/iv-503', location: 'Remote', status: 'Completed', notes: 'Strong portfolio.' },
  { id: 'IV-504', candidateId: 'C-1006', candidate: 'Arjun Verma', type: 'Manager', interviewer: 'Ms. Payel Saha', date: '2026-08-08', time: '10:30 AM', link: 'meet.fute.com/iv-504', location: 'Remote', status: 'Scheduled', notes: '' },
  { id: 'IV-505', candidateId: 'C-1007', candidate: 'Meera Pillai', type: 'HR', interviewer: 'Ms. Payel Saha', date: '2026-07-30', time: '02:00 PM', link: '', location: 'Conference Room A', status: 'Cancelled', notes: 'Candidate withdrew.' },
  { id: 'IV-506', candidateId: 'C-1004', candidate: 'Karan Mehta', type: 'Technical', interviewer: 'Nesamanikandan', date: '2026-08-09', time: '01:00 PM', link: 'meet.fute.com/iv-506', location: 'Remote', status: 'Rescheduled', notes: 'Moved from Aug 4.' },
];

export const meetings = [
  { id: 'MT-201', title: 'Weekly HR Sync', type: 'HR Meeting', agenda: 'Review open positions and pipeline health.', participants: ['Ms. Payel Saha', 'Nesamanikandan', 'Sangeetha KS'], date: '2026-08-06', time: '09:30 AM', notes: '' },
  { id: 'MT-202', title: 'Offer discussion — Priya Nair', type: 'Candidate Meeting', agenda: 'Finalize compensation before sending offer.', participants: ['Ms. Payel Saha', 'Founder'], date: '2026-08-06', time: '04:00 PM', notes: 'Budget approved up to ₹15 LPA.' },
  { id: 'MT-203', title: 'Q3 Hiring Plan', type: 'Team Meeting', agenda: 'Headcount planning for Q3.', participants: ['Founder', 'Ms. Payel Saha', 'Department Managers'], date: '2026-08-10', time: '11:00 AM', notes: '' },
];

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'Work From Home'];

// yyyy-mm-dd -> status, per employee id, for the current month demo view
export const attendanceRecords = [
  { employeeId: '10347', date: '2026-08-01', status: 'Present', checkIn: '09:12', checkOut: '18:30' },
  { employeeId: '10347', date: '2026-08-02', status: 'Present', checkIn: '09:05', checkOut: '18:20' },
  { employeeId: '10347', date: '2026-08-03', status: 'Work From Home', checkIn: '09:30', checkOut: '18:00' },
  { employeeId: '10347', date: '2026-08-04', status: 'Late', checkIn: '10:45', checkOut: '19:00' },
  { employeeId: '10347', date: '2026-08-05', status: 'Present', checkIn: '09:00', checkOut: '18:15' },
  { employeeId: '10068', date: '2026-08-01', status: 'Present', checkIn: '09:00', checkOut: '18:00' },
  { employeeId: '10068', date: '2026-08-02', status: 'Present', checkIn: '08:55', checkOut: '18:10' },
  { employeeId: '10068', date: '2026-08-03', status: 'Half Day', checkIn: '09:00', checkOut: '13:00' },
  { employeeId: '10068', date: '2026-08-04', status: 'Present', checkIn: '09:10', checkOut: '18:05' },
  { employeeId: '10068', date: '2026-08-05', status: 'Present', checkIn: '09:02', checkOut: '18:25' },
  { employeeId: '10331', date: '2026-08-01', status: 'Present', checkIn: '09:20', checkOut: '18:00' },
  { employeeId: '10331', date: '2026-08-02', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: '10331', date: '2026-08-03', status: 'Present', checkIn: '09:15', checkOut: '18:10' },
  { employeeId: '10331', date: '2026-08-04', status: 'Present', checkIn: '09:10', checkOut: '18:00' },
  { employeeId: '10331', date: '2026-08-05', status: 'Work From Home', checkIn: '09:00', checkOut: '17:45' },
  { employeeId: '10292', date: '2026-08-01', status: 'Present', checkIn: '09:30', checkOut: '18:00' },
  { employeeId: '10292', date: '2026-08-02', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: '10292', date: '2026-08-03', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: '10292', date: '2026-08-04', status: 'Absent', checkIn: '-', checkOut: '-' },
  { employeeId: '10292', date: '2026-08-05', status: 'Absent', checkIn: '-', checkOut: '-' },
];

export const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave'];
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const leaveRequests = [
  { id: 'LV-301', employeeId: '10331', employee: 'Sangeetha KS', type: 'Casual Leave', from: '2026-08-12', to: '2026-08-13', days: 2, reason: 'Family function', status: 'Pending' },
  { id: 'LV-302', employeeId: '10337', employee: 'Yogesh Kumar', type: 'Sick Leave', from: '2026-08-06', to: '2026-08-06', days: 1, reason: 'Fever', status: 'Approved' },
  { id: 'LV-303', employeeId: '10292', employee: 'Mohanprabu', type: 'Earned Leave', from: '2026-08-01', to: '2026-08-05', days: 5, reason: 'Personal travel', status: 'Approved' },
  { id: 'LV-304', employeeId: '10347', employee: 'Nesamanikandan', type: 'Casual Leave', from: '2026-08-20', to: '2026-08-20', days: 1, reason: 'Personal work', status: 'Pending' },
  { id: 'LV-305', employeeId: '10338', employee: 'Kumar Gautam', type: 'Earned Leave', from: '2026-08-15', to: '2026-08-18', days: 4, reason: 'Vacation', status: 'Rejected' },
];

export const leaveBalances = [
  { employeeId: '10347', casual: 6, sick: 5, earned: 10 },
  { employeeId: '10068', casual: 8, sick: 6, earned: 12 },
  { employeeId: '10331', casual: 4, sick: 3, earned: 8 },
  { employeeId: '10337', casual: 9, sick: 6, earned: 12 },
  { employeeId: '10292', casual: 2, sick: 1, earned: 5 },
  { employeeId: '10338', casual: 5, sick: 4, earned: 7 },
];

export const notifications = [
  { id: 'N-1', type: 'Interview Scheduled', text: 'Technical round scheduled with Ananya Rao — Aug 7, 11:00 AM', time: '10 min ago', unread: true },
  { id: 'N-2', type: 'Leave Request', text: 'Sangeetha KS requested Casual Leave (Aug 12-13)', time: '32 min ago', unread: true },
  { id: 'N-3', type: 'New Candidate', text: 'Karan Mehta applied for Backend Developer', time: '2 hr ago', unread: true },
  { id: 'N-4', type: 'Employee Joined', text: 'Yogesh Kumar joined as Full stack developer intern', time: '1 day ago', unread: false },
  { id: 'N-5', type: 'Task Assigned', text: 'You were assigned "Update employee handbook"', time: '2 days ago', unread: false },
  { id: 'N-6', type: 'Offer Letter', text: 'Offer sent to Priya Nair for Product Designer', time: '3 days ago', unread: false },
];

export const emails = {
  inbox: [
    { id: 'EM-1', from: 'ananya.rao@mail.com', subject: 'Re: Technical Round Confirmation', preview: 'Thanks, I confirm 11 AM on Aug 7 works for me...', time: '9:14 AM', unread: true, thread: [
      { from: 'Ms. Payel Saha', to: 'ananya.rao@mail.com', body: 'Hi Ananya, confirming your technical round on Aug 7, 11 AM with Nesamanikandan.', time: 'Aug 5, 4:02 PM' },
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
  { id: 'FB-2', candidate: 'Meera Pillai', interviewId: 'IV-505', interviewer: 'Ms. Payel Saha', rating: 2, recommendation: 'Reject', comments: 'Candidate withdrew before the round could be completed.' },
  { id: 'FB-3', candidate: 'Devansh Gupta', interviewId: 'IV-500', interviewer: 'Nesamanikandan', rating: 4, recommendation: 'Hire', comments: 'Solid React Native fundamentals, good problem solving.' },
];

export const activityLogs = [
  { id: 'AL-1', user: 'Ms. Payel Saha', action: 'Approved leave request LV-302', time: '2026-08-05 18:22', ip: '10.0.0.14', device: 'Chrome / Windows' },
  { id: 'AL-2', user: 'Sangeetha KS', action: 'Uploaded resume for Karan Mehta', time: '2026-08-05 16:03', ip: '10.0.0.22', device: 'Chrome / macOS' },
  { id: 'AL-3', user: 'Nesamanikandan', action: 'Scheduled interview IV-506', time: '2026-08-05 14:47', ip: '10.0.0.31', device: 'Edge / Windows' },
  { id: 'AL-4', user: 'Ms. Payel Saha', action: 'Sent offer letter to Priya Nair', time: '2026-08-03 12:10', ip: '10.0.0.14', device: 'Chrome / Windows' },
  { id: 'AL-5', user: 'Founder', action: 'Logged in', time: '2026-08-06 08:55', ip: '10.0.0.5', device: 'Safari / macOS' },
  { id: 'AL-6', user: 'Sangeetha KS', action: 'Updated attendance for 10331', time: '2026-08-05 09:31', ip: '10.0.0.22', device: 'Chrome / macOS' },
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
