import api from './axios';

export const doctorApi = {
  patients: () => api.get('/doctors/patients'),
  patientDetail: (patientId) => api.get(`/doctors/patients/${patientId}`),
  patientCheckups: (patientId, params) => api.get(`/doctors/patients/${patientId}/checkups`, { params }),
  monthlyStatus: (patientId, params) => api.get(`/doctors/patients/${patientId}/monthly-status`, { params }),
  createCheckup: (patientId, data) => api.post(`/doctors/patients/${patientId}/checkups`, data),
  updateCheckup: (checkupId, data) => api.patch(`/doctors/checkups/${checkupId}`, data),
  listCheckups: (params) => api.get('/doctors/checkups', { params }),
  batchCreate: (data) => api.post('/doctors/checkups/batch', data),
  batchUpdate: (data) => api.patch('/doctors/checkups/batch', data),
  updateApproval: (checkupId, status, note) => api.patch(`/doctors/checkups/${checkupId}/approval`, { status, note }),
  uploadDocuments: (checkupId, { files, name, notes }) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('documents', file));
    if (name !== undefined) formData.append('name', name);
    if (notes !== undefined) formData.append('notes', notes);
    return api.post(`/doctors/checkups/${checkupId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
