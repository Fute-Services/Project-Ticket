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

// Complaints — the queue each role is allowed to see
export const getFounderComplaints = () => api.get('/api/founder/complaints');
export const getHrComplaints = () => api.get('/api/hr/complaints');
export const getItComplaints = () => api.get('/api/it/complaints');
export const getMyHrComplaints = () => api.get('/api/hr/complaints/my');
export const getMyItComplaints = () => api.get('/api/it/complaints/my');

// Lookup by ticket token (FT-HR-XXXXXX / FT-IT-XXXXXX)
export const searchHrByToken = (token) => api.get('/api/hr/complaints/search', { params: { token } });
export const searchItByToken = (token) => api.get('/api/it/complaints/search', { params: { token } });

// Status changes — HR/IT staff and founders only; the API 403s for anyone else
export const updateHrStatus = (id, status) => api.patch(`/api/hr/complaints/${id}/status`, { status });
export const updateItStatus = (id, status) => api.patch(`/api/it/complaints/${id}/status`, { status });

export default api;
