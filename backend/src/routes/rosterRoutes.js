import express from 'express';
import { getTodayRoster } from '../controllers/rosterController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

router.get(
  '/today',
  authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.TECHNICIAN, ROLES.DOCTOR, ROLES.FRONT_DESK),
  getTodayRoster
);

export default router;
