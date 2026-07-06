import express from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Read-only, admin-only. No create/update/delete endpoints (append-only trail).
router.get('/', protect, authorize(ROLES.ADMIN), listAuditLogs);

export default router;
