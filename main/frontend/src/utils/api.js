import axios from 'axios';
import { PAGE_SIZE } from './constants';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fute_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// List endpoints return { items, nextCursor, hasMore } — never the whole collection
const page = ({ cursor, limit = PAGE_SIZE } = {}) => ({
  params: cursor ? { limit, cursor } : { limit },
});

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);

// HR Complaints
export const submitHRComplaint = (data) => api.post('/api/hr/complaints', data);
export const getMyHRComplaints = (opts) => api.get('/api/hr/complaints/my', page(opts));
export const getAllHRComplaints = (opts) => api.get('/api/hr/complaints', page(opts));
export const searchHRByToken = (token) => api.get('/api/hr/complaints/search', { params: { token } });
export const updateHRStatus = (id, status) => api.patch(`/api/hr/complaints/${id}/status`, { status });

// IT Complaints
export const submitITComplaint = (data) => api.post('/api/it/complaints', data);
export const getMyITComplaints = (opts) => api.get('/api/it/complaints/my', page(opts));
export const getAllITComplaints = (opts) => api.get('/api/it/complaints', page(opts));
export const searchITByToken = (token) => api.get('/api/it/complaints/search', { params: { token } });
export const updateITStatus = (id, status) => api.patch(`/api/it/complaints/${id}/status`, { status });

// Founder
export const getAllComplaintsFounder = (opts) => api.get('/api/founder/complaints', page(opts));

// Stats
export const getMyStats = () => api.get('/api/stats/me');

export default api;
