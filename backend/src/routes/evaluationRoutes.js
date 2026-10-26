import express from 'express';
import {
  createEvaluation,
  batchEvaluation,
  listEvaluations,
  deleteEvaluation,
  monthlyProgress,
  weeklyProgress,
  notifyPending,
} from '../controllers/evaluationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

// Progress / completion tracking (4 monthly rounds; 1 weekly per week).
router.get('/monthly-progress', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.DON), monthlyProgress);
router.get('/weekly-progress', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.DON), weeklyProgress);
router.post('/notify-pending', authorize(ROLES.ADMIN, ROLES.DOCTOR), notifyPending);

// Doctors author weekly evaluations + monthly rounds; doctor/DON/admin can read.
router.post('/batch', authorize(ROLES.ADMIN, ROLES.DOCTOR), batchEvaluation);
router.post('/:patientId', authorize(ROLES.ADMIN, ROLES.DOCTOR), createEvaluation);
router.get('/:patientId', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.DON, ROLES.NURSE), listEvaluations);
router.delete('/:patientId/:evalId', authorize(ROLES.ADMIN, ROLES.DOCTOR), deleteEvaluation);

export default router;
