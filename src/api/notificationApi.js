import api from './axios';

export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  forceSend: (data) => api.post('/notifications/force', data),
  testInsuranceExpiry: (data) => api.post('/notifications/test-insurance-expiry', data),
};
