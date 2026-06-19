import api from './axios';

export const scheduleApi = {
  list: (params) => api.get('/schedules', { params }),
  create: (data) => api.post('/schedules', data),
  get: (code) => api.get(`/schedules/${code}`),
  update: (code, data) => api.patch(`/schedules/${code}`, data),
  delete: (code) => api.delete(`/schedules/${code}`),
  today: () => api.get('/schedules/today'),
  upcoming: () => api.get('/schedules/upcoming'),
  byPatient: (mrn) => api.get(`/schedules/patient/${mrn}`),
  availability: (params) => api.get('/schedules/availability', { params }),
  cancel: (code, data) => api.patch(`/schedules/${code}/cancel`, data),
  approveCancel: (code) => api.patch(`/schedules/${code}/cancel/approve`),
  approve: (code) => api.patch(`/schedules/${code}/approve`),
  reject: (code, data) => api.patch(`/schedules/${code}/reject`, data),
};
