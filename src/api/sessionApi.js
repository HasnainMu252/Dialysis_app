import api from './axios';

export const sessionApi = {
  list: (params) => api.get('/sessions', { params }),
  checkIn: (id) => api.patch(`/sessions/${id}/check-in`),
  start: (id) => api.patch(`/sessions/${id}/start`),
  vitals: (id, data) => api.post(`/sessions/${id}/vitals`, data),
  soap: (id, data) => api.post(`/sessions/${id}/soap`, data),
  finalize: (id, data) => api.patch(`/sessions/${id}/finalize`, data),
  addNote: (id, data) => api.post(`/sessions/${id}/technician-notes`, data),
  deleteNote: (id, noteId) => api.delete(`/sessions/${id}/technician-notes/${noteId}`),
  complete: (id, data) => api.patch(`/sessions/${id}/complete`, data),
  uploadDocuments: (id, { files, name, notes }) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('documents', file));
    if (name !== undefined) formData.append('name', name);
    if (notes !== undefined) formData.append('notes', notes);
    return api.post(`/sessions/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
