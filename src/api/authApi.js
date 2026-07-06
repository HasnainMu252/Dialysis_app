import api from './axios';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  mfaSetup: () => api.post('/auth/mfa/setup'),
  mfaEnable: (token) => api.post('/auth/mfa/enable', { token }),
  mfaDisable: (token) => api.post('/auth/mfa/disable', { token }),
};
