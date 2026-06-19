import AuditLog from '../models/AuditLog.js';
export const writeAudit = async ({ user, action, entity, entityId, status='success', details={} }) => {
  try { await AuditLog.create({ user: user?._id || user, action, entity, entityId, status, details }); } catch { /* never block main flow */ }
};
