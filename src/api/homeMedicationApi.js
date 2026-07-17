import api from './axios';

export const homeMedicationApi = {
  list: (idOrMrn, params) => api.get(`/patients/${idOrMrn}/home-medications`, { params }),
  cancel: (id, cancelReason) => api.patch(`/home-medications/${id}`, { status: 'discontinued', cancelReason }),
  reactivate: (id) => api.patch(`/home-medications/${id}`, { status: 'active' }),
  add: (idOrMrn, body) => api.post(`/patients/${idOrMrn}/home-medications`, body),
  update: (id, body) => api.patch(`/home-medications/${id}`, body),
  remove: (id) => api.delete(`/home-medications/${id}`),
};

export const HOME_MED_ROUTES = ['IV', 'Oral', 'Arterial', 'Venous', 'Subcutaneous', 'Inhaled', 'Topical', 'Other'];
export const HOME_MED_UNITS = ['mg', 'mcg', 'ml', 'IU', 'Units', 'tablet', 'capsule', 'drop', 'puff'];
export const HOME_MED_FREQUENCIES = [
  'Once daily',
  'Twice daily (BID)',
  'Three times daily (TID)',
  'Four times daily (QID)',
  'Every other day',
  'Weekly',
  'With dialysis',
  'As needed (PRN)',
  'Other',
];
