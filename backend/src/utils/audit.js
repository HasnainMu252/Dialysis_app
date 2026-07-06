import AuditLog from '../models/AuditLog.js';

// Never throws — auditing must not block the main request flow.
export const writeAudit = async ({
  user, userEmail, userRole, action, entity, entityId,
  method, path, statusCode, ipAddress, userAgent,
  status = 'success', details = {},
} = {}) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userEmail: userEmail || user?.email,
      userRole: userRole || user?.role,
      action, entity, entityId,
      method, path, statusCode, ipAddress, userAgent,
      status, details,
    });
  } catch {
    /* swallow — auditing is best-effort */
  }
};
