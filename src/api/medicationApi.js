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

// Access types used in the treatment / session flow — same full list for every
// role that records it (nurse, technician, etc). "Other" opens a free-text field.
export const TREATMENT_ACCESS_TYPES = ['Fistula', 'AV Graft', 'Non-tunnel catheter', 'Tunnel catheter', 'Not applicable', 'Other'];

/* Role-specific vascular-access presets (all include "Other" -> free text). */
export const NURSE_ACCESS_TYPES = TREATMENT_ACCESS_TYPES;
export const TECH_ACCESS_TYPES = TREATMENT_ACCESS_TYPES;
// Every role that uses the treatment flow sees the same full access-type list.
export const accessTypesForRole = () => TREATMENT_ACCESS_TYPES;
