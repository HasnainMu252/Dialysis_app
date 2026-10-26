import api from './axios';

export const patientApi = {
  list: (params) => api.get('/patients', { params }),
  listIds: (params) => api.get('/patients/ids', { params }),
  cleanupOrphans: () => api.post('/patients/cleanup-orphans', {}),
  recurringStart: (idOrMrn, body) => api.post(`/patients/${idOrMrn}/recurring/start`, body || {}),
  recurringStop: (idOrMrn, body) => api.post(`/patients/${idOrMrn}/recurring/stop`, body || {}),
  create: (data) => api.post('/patients', data),
  get: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.patch(`/patients/${id}`, data),
  sendToBiller: (id) => api.patch(`/patients/${id}/send-to-biller`),
  updateVascularAccess: (id, data) => api.patch(`/patients/${id}/vascular-access`, data),
  updateSocialWork: (id, data) => api.patch(`/patients/${id}/social-work`, data),
  updateMedicalBackground: (id, data) => api.patch(`/patients/${id}/medical-background`, data),
  updateNutrition: (id, data) => api.patch(`/patients/${id}/nutrition`, data),
  addVaccination: (id, data) => api.post(`/patients/${id}/vaccinations`, data),
  deleteVaccination: (id, vaccinationId) => api.delete(`/patients/${id}/vaccinations/${vaccinationId}`),
  updateDietitianAssessment: (id, data) => api.patch(`/patients/${id}/dietitian-assessment`, data),
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
