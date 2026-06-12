import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
});

export const getDashboardStats = () => api.get('/api/dashboard/stats').then(r => r.data);
export const getLeads = (params) => api.get('/api/leads', { params }).then(r => r.data);
export const getLead = (id) => api.get(`/api/leads/${id}`).then(r => r.data);
export const updateLead = (id, data) => api.put(`/api/leads/${id}`, data).then(r => r.data);
export const getAppointments = (params) => api.get('/api/appointments', { params }).then(r => r.data);
export const createAppointment = (data) => api.post('/api/appointments', data).then(r => r.data);
export const deleteAppointment = (id) => api.delete(`/api/appointments/${id}`).then(r => r.data);
export const updateAppointmentStatus = (id, status) => api.put(`/api/appointments/${id}/status`, { status }).then(r => r.data);
export const getServices = () => api.get('/api/services').then(r => r.data);
export const createService = (data) => api.post('/api/services', data).then(r => r.data);
export const updateService = (id, data) => api.put(`/api/services/${id}`, data).then(r => r.data);
export const deleteService = (id) => api.delete(`/api/services/${id}`).then(r => r.data);
export const replyLead = (id, message) => api.post(`/api/leads/${id}/reply`, { message }).then(r => r.data);
export const resetBot = (id) => api.post(`/api/leads/${id}/reset-bot`).then(r => r.data);
