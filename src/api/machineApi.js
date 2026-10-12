import api from './axios';

export const machineApi = {
  list: (params) => api.get('/machines', { params }),
  get: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.patch(`/machines/${id}`, data),
  remove: (id) => api.delete(`/machines/${id}`),
  addMaintenance: (id, data) => api.post(`/machines/${id}/maintenance`, data),
};

export const MACHINE_STATUS = ['available', 'in_use', 'maintenance', 'out_of_order'];
export const MAINTENANCE_TYPES = ['Preventive', 'Repair', 'Calibration', 'Disinfection', 'Other'];
