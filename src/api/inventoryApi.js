import api from './axios';

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
  transaction: (id, data) => api.post(`/inventory/${id}/transaction`, data),
};

export const INVENTORY_CATEGORIES = [
  { value: 'drug', label: 'Drug' },
  { value: 'non_drug', label: 'Non-drug' },
];
export const TXN_TYPES = [
  { value: 'purchase', label: 'Purchase (+)' },
  { value: 'usage', label: 'Usage (−)' },
  { value: 'adjustment', label: 'Adjustment (±)' },
];
