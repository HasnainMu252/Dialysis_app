import api from './axios';

export const cqiApi = {
  list: (idOrMrn) => api.get(`/patients/${idOrMrn}/cqi-comments`),
  upsert: (idOrMrn, body) => api.put(`/patients/${idOrMrn}/cqi-comments`, body),
  remove: (id) => api.delete(`/cqi-comments/${id}`),
};

export const CQI_ROLES = ['nurse', 'technician', 'social_worker'];
