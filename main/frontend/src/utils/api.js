import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
});

// Attach the JWT to every request automatically. "Remember me" decides which
// store AuthContext wrote it to, so check both.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fute_token') || sessionStorage.getItem('fute_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const getMe = () => api.get('/api/auth/me');
export const verifyPassword = (password) => api.post('/api/auth/verify-password', { password });

// Founder — role permissions' per-user overrides
export const getUsers = (role) => api.get('/api/founder/users', { params: { role } });
export const createUser = (data) => api.post('/api/founder/users', data);
export const updateUserPermissions = (uid, permissionOverrides) =>
  api.patch(`/api/founder/users/${uid}/permissions`, { permissionOverrides });

// Super Admin — full user management
export const updateUser = (uid, data) => api.patch(`/api/founder/users/${uid}`, data);
export const setUserActive = (uid, active, reason) => api.patch(`/api/founder/users/${uid}/active`, { active, reason });
export const resetUserPassword = (uid, password) => api.patch(`/api/founder/users/${uid}/reset-password`, { password });
export const deleteUser = (uid, reason) => api.delete(`/api/founder/users/${uid}`, { data: { reason } });

// Super Admin — audit log, analytics, system settings
export const getAuditLogs = (limit) => api.get('/api/founder/audit-logs', { params: { limit } });
export const getAnalytics = (params) => api.get('/api/founder/analytics', { params });
export const exportAnalyticsCsv = (params) => api.get('/api/founder/analytics/export', { params, responseType: 'blob' });

// Super Admin — global search across users/tickets/assets/departments
export const globalSearch = (q) => api.get('/api/founder/search', { params: { q } });
export const getActivityTimeline = (limit) => api.get('/api/founder/activity-timeline', { params: { limit } });
export const getDashboardOverview = () => api.get('/api/founder/dashboard-overview');
export const updateDashboardLayout = (widgets) => api.patch('/api/founder/dashboard-layout', { widgets });

// Super Admin — SLA policies (per-priority, per-queue) and compliance
export const getSlaPolicies = () => api.get('/api/founder/sla-policies');
export const updateSlaPolicies = (policies) => api.put('/api/founder/sla-policies', { policies });
export const getSlaCompliance = () => api.get('/api/founder/sla-compliance');

// Super Admin — Security Center
export const getSessions = () => api.get('/api/founder/security/sessions');
export const revokeSession = (id, reason) => api.patch(`/api/founder/security/sessions/${id}/revoke`, { reason });
export const forceLogoutUser = (uid, reason) => api.patch(`/api/founder/security/users/${uid}/force-logout`, { reason });
export const getFailedLogins = (limit) => api.get('/api/founder/security/failed-logins', { params: { limit } });
export const getLockedAccounts = () => api.get('/api/founder/security/locked-accounts');
export const unlockAccount = (uid) => api.patch(`/api/founder/security/users/${uid}/unlock`);

// Super Admin — notification rules
export const getNotificationRules = () => api.get('/api/founder/notification-rules');
export const updateNotificationRules = (rules) => api.put('/api/founder/notification-rules', { rules });
export const getSystemSettings = () => api.get('/api/founder/system-settings');
export const updateSystemSettings = (settings) => api.put('/api/founder/system-settings', { settings });

// Super Admin — departments
export const getDepartments = () => api.get('/api/founder/departments');
export const createDepartment = (data) => api.post('/api/founder/departments', data);
export const updateDepartment = (id, data) => api.patch(`/api/founder/departments/${id}`, data);
export const deleteDepartment = (id, reason) => api.delete(`/api/founder/departments/${id}`, { data: { reason } });

// Super Admin — granular action-level permissions (resource -> allowed actions)
export const getActionPermissions = () => api.get('/api/founder/action-permissions');
export const updateActionPermissions = (permissions) => api.put('/api/founder/action-permissions', { permissions });

// Complaints — the queue each role is allowed to see
export const getFounderComplaints = () => api.get('/api/founder/complaints');
// "Load More" pagination — pass the previous response's nextCursor to fetch
// the next page; response is { items, nextCursor }.
export const getHrComplaints = (after) => api.get('/api/hr/complaints', { params: after ? { after } : {} });
export const getItComplaints = (after) => api.get('/api/it/complaints', { params: after ? { after } : {} });
export const getMyHrComplaints = () => api.get('/api/hr/complaints/my');
export const getMyItComplaints = () => api.get('/api/it/complaints/my');

// Create — any logged-in user can raise a ticket for themself
export const createHrComplaint = (data) => api.post('/api/hr/complaints', data);
export const createItComplaint = (data) => api.post('/api/it/complaints', data);

// Lookup by ticket token (FT-HR-XXXXXX / FT-IT-XXXXXX)
export const searchHrByToken = (token) => api.get('/api/hr/complaints/search', { params: { token } });
export const searchItByToken = (token) => api.get('/api/it/complaints/search', { params: { token } });

// Status changes — HR/IT staff and founders only; the API 403s for anyone else
export const updateHrStatus = (id, status) => api.patch(`/api/hr/complaints/${id}/status`, { status });
export const updateItStatus = (id, status) => api.patch(`/api/it/complaints/${id}/status`, { status });

// Editable columns (employeeStatus, solver, remarks, vpnNo, employeeId) — HR/IT staff and founders only
export const updateHrFields = (id, fields) => api.patch(`/api/hr/complaints/${id}/fields`, fields);
export const updateItFields = (id, fields) => api.patch(`/api/it/complaints/${id}/fields`, fields);

// Delete — only the employee who raised the ticket can delete it
export const deleteHrComplaint = (id) => api.delete(`/api/hr/complaints/${id}`);
export const deleteItComplaint = (id) => api.delete(`/api/it/complaints/${id}`);

// Approvals — IT/HR desks submit and read, founder decides
export const getApprovals = (after) => api.get('/api/approvals', { params: after ? { after } : {} });
export const submitApprovalRequest = (data) => api.post('/api/approvals', data);
export const decideApproval = (id, status) => api.patch(`/api/approvals/${id}/decide`, { status });

// Leave — any employee applies, HR/founder read all + decide
export const applyLeave = (data) => api.post('/api/leave', data);
export const getAllLeaves = () => api.get('/api/leave');
export const getMyLeaves = () => api.get('/api/leave/my');
export const decideLeave = (id, status) => api.patch(`/api/leave/${id}/decide`, { status });

// Assets — IT desk inventory
export const getAssets = () => api.get('/api/it/assets');
export const createAsset = (data) => api.post('/api/it/assets', data);
export const updateAsset = (id, data) => api.put(`/api/it/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/api/it/assets/${id}`);

// Tasks/Projects — Coordinator, Founder, and Employee "My Tasks/Projects" all read
export const getProjects = () => api.get('/api/coordinator/projects');
export const getTasks = (after) => api.get('/api/coordinator/tasks', { params: after ? { after } : {} });
export const createTask = (data) => api.post('/api/coordinator/tasks', data);
export const updateTaskStatus = (id, status) => api.patch(`/api/coordinator/tasks/${id}/status`, { status });
export const updateTask = (id, patch) => api.patch(`/api/coordinator/tasks/${id}`, patch);

// Rendering Status — Production logs jobs, IT reads the same list
export const getRenders = () => api.get('/api/production/renders');
export const addRender = (data) => api.post('/api/production/renders', data);
export const updateRender = (id, patch) => api.patch(`/api/production/renders/${id}`, patch);

// HR desk sub-resources — Candidates, Interviews, Meetings, Attendance,
// Feedback, Job postings all share the same list/create/update/delete shape.
function hrDeskResource(path) {
  return {
    list: () => api.get(`/api/hr-desk/${path}`),
    create: (data) => api.post(`/api/hr-desk/${path}`, data),
    update: (id, patch) => api.patch(`/api/hr-desk/${path}/${id}`, patch),
    remove: (id) => api.delete(`/api/hr-desk/${path}/${id}`),
  };
}
export const employeesApi = hrDeskResource('employees');
export const candidatesApi = hrDeskResource('candidates');
export const interviewsApi = hrDeskResource('interviews');
export const meetingsApi = hrDeskResource('meetings');
export const attendanceApi = hrDeskResource('attendance');
export const feedbackApi = hrDeskResource('feedback');
export const jobsApi = hrDeskResource('jobs');

// HR Email — real SMTP send via the backend's mailer, Sent folder persists across sessions
export const sendHrEmail = (data) => api.post('/api/hr-desk/send-email', data);
export const getSentHrEmails = () => api.get('/api/hr-desk/send-email');

export default api;
