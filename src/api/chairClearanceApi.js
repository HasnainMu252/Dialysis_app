import api from './axios';
export const chairClearanceApi = {
  list: (params) => api.get('/chair-clearances', { params }),
  create: (chairCode, data) => api.post(`/chair-clearances/${chairCode}`, data),
  resolve: (id) => api.patch(`/chair-clearances/${id}/resolve`),
};

export const MAINTENANCE_TYPES = ['Routine clean', 'Issue report', 'Repair', 'Calibration', 'Filter change', 'Other'];
