import api from './axios';

export const insuranceFormApi = {
  createForPatient: (patientId, data) => api.post(`/insurance-forms/patient/${patientId}`, data),
  getByPatient: (patientId) => api.get(`/insurance-forms/patient/${patientId}`),
  update: (insuranceFormId, data) => api.patch(`/insurance-forms/${insuranceFormId}`, data),
  delete: (insuranceFormId) => api.delete(`/insurance-forms/${insuranceFormId}`),
  uploadDocuments: (insuranceFormId, { files, name, documentDate, notes }) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('documents', file));
    if (name !== undefined) formData.append('name', name);
    if (documentDate !== undefined) formData.append('documentDate', documentDate);
    if (notes !== undefined) formData.append('notes', notes);
    return api.post(`/insurance-forms/${insuranceFormId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateDocument: (insuranceFormId, documentId, data) => api.patch(`/insurance-forms/${insuranceFormId}/documents/${documentId}`, data),
  deleteDocument: (insuranceFormId, documentId) => api.delete(`/insurance-forms/${insuranceFormId}/documents/${documentId}`),
  expiring: () => api.get('/insurance-forms/expiring'),
  insurancePersonDashboard: () => api.get('/insurance-person/dashboard'),
};
