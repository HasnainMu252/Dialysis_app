import express from 'express';
import {
  getOverviewReport,
  getMonthlySoapReport,
  getMonthlySessionReport,
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.use(protect);

router.get('/overview', authorize(...PERMISSIONS.reports), getOverviewReport);
router.get('/sessions/monthly', authorize(...PERMISSIONS.reports), getMonthlySessionReport);
router.get('/soap/monthly', authorize(...PERMISSIONS.doctorRounds), getMonthlySoapReport);

export default router;
