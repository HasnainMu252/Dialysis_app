import api from './axios';

export const medicationApi = {
  recordForSession: (sessionId, medications) => api.post(`/medications/session/${sessionId}`, { medications }),
  list: (params) => api.get('/medications', { params }),
  patientHistory: (idOrMrn) => api.get(`/patients/${idOrMrn}/medications`),
  monthlySummary: (idOrMrn, params) => api.get(`/patients/${idOrMrn}/monthly-summary`, { params }),
  report: (params) => api.get('/medications/report', { params }),
  billing: (params) => api.get('/medications/billing', { params }),
};

export const MEDICATION_ROUTES = ['IV', 'Oral', 'Arterial', 'Venous', 'Subcutaneous', 'Inhaled', 'Other'];
export const COMMON_UNITS = ['mg', 'mcg', 'ml', 'IU', 'Units', 'min'];
