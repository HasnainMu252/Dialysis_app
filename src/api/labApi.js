import api from './axios';

export const labApi = {
  list: (params) => api.get('/labs', { params }),
  upload: (formData) => api.post('/labs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/labs/${id}`),
};

export const LAB_CATEGORIES = [
  'CBC', 'KFT / Renal', 'LFT', 'Electrolytes', 'Iron Studies',
  'PTH', 'Hepatitis Screening', 'Urine', 'Imaging', 'Other',
];

export const LAB_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
