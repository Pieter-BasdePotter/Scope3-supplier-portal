import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/supplier/')) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (credentials) => api.post('/auth/login', credentials).then(r => r.data);

// ─── Customer: Requests ──────────────────────────────────────────────────────
export const getRequests      = () => api.get('/requests').then(r => r.data);
export const getRequest       = (id) => api.get(`/requests/${id}`).then(r => r.data);
export const createRequest    = (data) => api.post('/requests', data).then(r => r.data);
export const validateRequest  = (id) => api.post(`/requests/${id}/validate`).then(r => r.data);
export const acceptRequest    = (id) => api.post(`/requests/${id}/accept`).then(r => r.data);
export const rejectRequest    = (id, note) => api.post(`/requests/${id}/reject`, { note }).then(r => r.data);
export const publishRequest   = (id) => api.post(`/requests/${id}/publish`).then(r => r.data);

// ─── Supplier portal ─────────────────────────────────────────────────────────
export const getSupplierForm  = (token) => api.get(`/supplier/${token}`).then(r => r.data);
export const saveDraft        = (token, data) => api.put(`/supplier/${token}/draft`, data).then(r => r.data);
export const submitForm       = (token, formData) =>
  api.post(`/supplier/${token}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

// ─── Published results ────────────────────────────────────────────────────────
export const getPublished = () => api.get('/published').then(r => r.data);
