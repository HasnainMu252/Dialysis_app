import api from './axios';

export const cqiApi = {
  // Thread for one patient
  list: (idOrMrn) => api.get(`/patients/${idOrMrn}/cqi-comments`),
  // Append a new entry (CQI is a log, not a single overwrite)
  add: (idOrMrn, body) => api.post(`/patients/${idOrMrn}/cqi-comments`, body),
  // Edit / remove a single entry (author or admin)
  update: (id, body) => api.patch(`/cqi-comments/${id}`, body),
  remove: (id) => api.delete(`/cqi-comments/${id}`),
  // Monthly review across all patients (admin / DON)
  reviewAll: (params) => api.get('/cqi-comments', { params }),
};

// Clinical roles who meet the patient and may author CQI comments.
export const CQI_ROLES = ['nurse', 'technician', 'social_worker', 'doctor', 'dietitian'];
