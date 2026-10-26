import api from './axios';

export const orderApi = {
  list: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  remove: (id) => api.delete(`/orders/${id}`),
};

export const ORDER_CATEGORIES = [
  { value: 'medication', label: 'Medication' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'dialysis', label: 'Dialysis' },
];

export const ORDER_STATUSES = ['ordered', 'in_progress', 'fulfilled', 'cancelled'];

export const ORDER_TYPES = [
  { value: 'nurse', label: 'Nurse', functional: true, hint: 'Goes to the nurse to carry out and complete.' },
  { value: 'pharmacy', label: 'Pharmacy', functional: false, hint: 'Recorded only — pharmacy routing is not functional yet.' },
  { value: 'radiology', label: 'Radiology', functional: false, hint: 'Recorded only — radiology routing is not functional yet.' },
];
