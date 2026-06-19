import { API_BASE_URL } from '../constants';

export const getArray = (res, key = 'data') => res?.data?.[key] || res?.data?.data || [];
export const personName = (p) => p?.fullName || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Unknown';
export const idOf = (x) => x?._id || x?.id || x;
export const dateOnly = (value) => value ? String(value).slice(0, 10) : '-';
export const money = (value) => Number(value || 0).toLocaleString();
export const toMinutes = (time = '00:00') => { const [h, m] = String(time).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const overlaps = (aStart, aEnd, bStart, bEnd) => toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
export const chairCodeOf = (chair) => chair?.code || chair?.chairNumber || chair?.name || '';

export const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const fileUrl = (url = '') => {
  if (!url) return '';
  const cleaned = String(url).replace(/\\/g, '/').trim();
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const path = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return `${apiOrigin}${path}`;
};

export const isReadByUser = (notification, user) => {
  const userId = user?._id || user?.id;
  if (!userId) return false;
  return (notification?.isReadBy || []).some((entry) => String(entry?.user?._id || entry?.user || '') === String(userId));
};
