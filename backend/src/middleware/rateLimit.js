import { ApiError } from '../utils/apiError.js';

const buckets = new Map();

export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 25 } = {}) => (req, _res, next) => {
  const key = `${req.ip}:${req.originalUrl}`;
  const now = Date.now();
  const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  current.count += 1;
  buckets.set(key, current);

  if (current.count > max) {
    return next(new ApiError(429, 'Too many requests. Please try again later.'));
  }

  next();
};
