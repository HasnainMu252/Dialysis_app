import api from './axios';

export const patientApi = {
  list: (params) => api.get('/patients', { params }),
  create: (data) => api.post('/patients', data),
  get: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.patch(`/patients/${id}`, data),
  sendToBiller: (id) => api.patch(`/patients/${id}/send-to-biller`),
  exportExcel: (params) => api.get('/patients/export', { params, responseType: 'blob' }),
  delete: (id) => api.delete(`/patients/${id}`),
  bulkDelete: (data) => api.delete('/patients/bulk-delete', { data }),
 
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/patients/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
