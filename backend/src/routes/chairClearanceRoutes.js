import express from 'express';
import {
  createChairClearance,
  listChairClearances,
} from '../controllers/chairClearanceController.js';
import { protect, authorize} from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get('/',authorize(ROLES.ADMIN, ROLES.TECHNICIAN), listChairClearances);
router.post('/:chairCode',authorize(ROLES.ADMIN,
    ROLES.TECHNICIAN,
    ROLES.NURSE), createChairClearance);

export default router;