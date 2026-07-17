import api from './axios';

export const medicationApi = {
  recordForSession: (sessionId, medications) => api.post(`/medications/session/${sessionId}`, { medications }),
  list: (params) => api.get('/medications', { params }),
  remove: (id) => api.delete(`/medications/${id}`),
  cancel: (id, reason) => api.patch(`/medications/${id}/cancel`, { reason }),
  history: (params) => api.get('/medications/history', { params }),
  patientHistory: (idOrMrn) => api.get(`/patients/${idOrMrn}/medications`),
  monthlySummary: (idOrMrn, params) => api.get(`/patients/${idOrMrn}/monthly-summary`, { params }),
  report: (params) => api.get('/medications/report', { params }),
  usage: (params) => api.get('/medications/usage', { params }),
  billing: (params) => api.get('/medications/billing', { params }),
};

export const MEDICATION_ROUTES = ['IV', 'Oral', 'Arterial', 'Venous', 'Subcutaneous', 'Inhaled', 'Other'];
export const COMMON_UNITS = ['mg', 'mcg', 'ml', 'IU', 'Units', 'min'];

/* Vascular access options for technician session notes. */
export const ACCESS_TYPES = ['Fistula', 'Graft', 'Catheter', 'AV Fistula', 'AV Graft', 'Other'];

/* Role-specific vascular-access presets (all include "Other" -> free text). */
export const NURSE_ACCESS_TYPES = ['Catheter', 'Tunnel', 'Quinton', 'Other'];
export const TECH_ACCESS_TYPES = ['AV', 'Fistula', 'AV Graft', 'Other'];
export const accessTypesForRole = (role) =>
  role === 'technician' ? TECH_ACCESS_TYPES
  : role === 'nurse' ? NURSE_ACCESS_TYPES
  : Array.from(new Set([...NURSE_ACCESS_TYPES, ...TECH_ACCESS_TYPES]));
