import api from './axios';

export const evaluationApi = {
  // One patient's evaluations (optionally filtered by kind).
  list: (patientId, params) => api.get(`/evaluations/${patientId}`, { params }),
  // Save one evaluation for one patient.
  create: (patientId, data) => api.post(`/evaluations/${patientId}`, data),
  // Save the same evaluation to many patients (shift-wise batch).
  batch: (data) => api.post('/evaluations/batch', data),
  remove: (patientId, evalId) => api.delete(`/evaluations/${patientId}/${evalId}`),
  // Completion tracking: 4 monthly rounds / 1 weekly per week.
  monthlyProgress: (params) => api.get('/evaluations/monthly-progress', { params }),
  weeklyProgress: (params) => api.get('/evaluations/weekly-progress', { params }),
  notifyPending: (data) => api.post('/evaluations/notify-pending', data),
};
