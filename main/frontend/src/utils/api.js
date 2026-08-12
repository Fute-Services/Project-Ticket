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

// Founder — role permissions' per-user overrides
export const getUsers = (role) => api.get('/api/founder/users', { params: { role } });
export const createUser = (data) => api.post('/api/founder/users', data);
export const updateUserPermissions = (uid, permissionOverrides) =>
  api.patch(`/api/founder/users/${uid}/permissions`, { permissionOverrides });

// Complaints — the queue each role is allowed to see
export const getFounderComplaints = () => api.get('/api/founder/complaints');
export const getHrComplaints = () => api.get('/api/hr/complaints');
export const getItComplaints = () => api.get('/api/it/complaints');
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

// Approvals — IT/HR desks submit and read, founder decides
export const getApprovals = () => api.get('/api/approvals');
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
export const getTasks = () => api.get('/api/coordinator/tasks');
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
