import express from 'express';
import {
  createChairClearance,
  listChairClearances,
  resolveChairClearance,
} from '../controllers/chairClearanceController.js';
import { protect, authorize} from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize(ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.BIOMED), listChairClearances);
router.post('/:chairCode', authorize(
    ROLES.ADMIN,
    ROLES.TECHNICIAN,
    ROLES.NURSE,
    ROLES.BIOMED), createChairClearance);

// Biomed (or admin) closes a maintenance item once the machine is handled.
router.patch('/:id/resolve', authorize(ROLES.ADMIN, ROLES.BIOMED), resolveChairClearance);

export default router;