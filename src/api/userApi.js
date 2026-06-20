import api from './axios';

export const userApi = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  resetPassword: (id, password) => api.patch(`/users/${id}/password`, { password }),
  remove: (id) => api.delete(`/users/${id}`),
};
