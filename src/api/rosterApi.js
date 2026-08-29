import api from './axios';

export const rosterApi = {
  today: (date) => api.get('/roster/today', { params: date ? { date } : {} }),
};
