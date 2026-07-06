import { writeAudit } from '../utils/audit.js';

// Derive a coarse entity name from the request URL, e.g. /api/v1/patients/123 -> "patients"
const deriveEntity = (url = '') => {
  const clean = url.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  const idx = parts.indexOf('v1');
  return idx >= 0 ? parts[idx + 1] : parts[0];
};

/**
 * Records an audit entry for every state-changing request (POST/PUT/PATCH/DELETE)
 * and for PHI document access (/files). Runs on response finish so the
 * authenticated user (set by `protect`) and final status code are available.
 * Append-only: there are no update/delete audit endpoints.
 */
export const auditLogger = (req, res, next) => {
  const isMutation = req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD';
  const isFileAccess = req.originalUrl.includes('/files/');
  if (!isMutation && !isFileAccess) return next();

  // Don't record health checks or the audit viewer itself
  if (req.originalUrl.includes('/health') || req.originalUrl.includes('/audit-logs')) return next();

  res.on('finish', () => {
    writeAudit({
      user: req.user,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: `${req.method} ${deriveEntity(req.originalUrl) || 'api'}`,
      entity: deriveEntity(req.originalUrl),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      status: res.statusCode < 400 ? 'success' : 'failed',
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};
