import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fute_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);

// HR Complaints
export const submitHRComplaint = (data) => api.post('/api/hr/complaints', data);
export const getMyHRComplaints = () => api.get('/api/hr/complaints/my');
export const getAllHRComplaints = () => api.get('/api/hr/complaints');
export const searchHRByToken = (token) => api.get(`/api/hr/complaints/search?token=${token}`);
export const updateHRStatus = (id, status) => api.patch(`/api/hr/complaints/${id}/status`, { status });

// IT Complaints
export const submitITComplaint = (data) => api.post('/api/it/complaints', data);
export const getMyITComplaints = () => api.get('/api/it/complaints/my');
export const getAllITComplaints = () => api.get('/api/it/complaints');
export const searchITByToken = (token) => api.get(`/api/it/complaints/search?token=${token}`);
export const updateITStatus = (id, status) => api.patch(`/api/it/complaints/${id}/status`, { status });

// Founder
export const getAllComplaintsFounder = () => api.get('/api/founder/complaints');

export default api;
