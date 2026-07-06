import asyncHandler from 'express-async-handler';
import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/v1/audit-logs
 * Admin-only, read-only, paginated audit trail with filters.
 * Query: page, limit, q (search), entity, status, from, to
 */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));
  const { q, entity, status, from, to } = req.query;

  const query = {};
  if (entity) query.entity = entity;
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ userEmail: rx }, { action: rx }, { path: rx }, { userRole: rx }, { ipAddress: rx }];
  }

  const [items, total, entities] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
    AuditLog.distinct('entity'),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { total, page, limit, pages: Math.ceil(total / limit), entities: entities.filter(Boolean) },
    message: 'Audit logs fetched',
    errors: [],
  });
});
