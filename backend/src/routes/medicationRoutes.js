import express from 'express';
import {
  recordSessionMedications,
  listMedications,
  getMedicationReport,
  getMedicationBilling,
} from '../controllers/medicationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

router.get('/', listMedications);
router.get('/report', authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR), getMedicationReport);
router.get('/billing', authorize(ROLES.ADMIN, ROLES.BILLER), getMedicationBilling);
router.post('/session/:sessionId', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.TECHNICIAN), recordSessionMedications);

export default router;
