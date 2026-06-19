import api from './axios';

export const doctorApi = {
  patients: () => api.get('/doctors/patients'),
  patientDetail: (patientId) => api.get(`/doctors/patients/${patientId}`),
  patientCheckups: (patientId, params) => api.get(`/doctors/patients/${patientId}/checkups`, { params }),
  monthlyStatus: (patientId, params) => api.get(`/doctors/patients/${patientId}/monthly-status`, { params }),
  createCheckup: (patientId, data) => api.post(`/doctors/patients/${patientId}/checkups`, data),
  updateCheckup: (checkupId, data) => api.patch(`/doctors/checkups/${checkupId}`, data),
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
