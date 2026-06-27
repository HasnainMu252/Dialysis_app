import api from './axios';
import { API_BASE_URL } from '../constants';

export const reportApi = {
  overview: () => api.get('/reports/overview'),
  monthlySessions: (params) => api.get('/reports/sessions/monthly', { params }),
  monthlySoap: (params) => api.get('/reports/soap/monthly', { params }),
  dialysisBilling: (params) => api.get('/reports/dialysis-billing', { params }),
  // Direct download URL for the Excel export (token appended for the file stream).
  monthlySoapExcelUrl: (month, year) =>
    `${API_BASE_URL}/reports/soap/monthly?month=${month}&year=${year}&format=xlsx`,
};
