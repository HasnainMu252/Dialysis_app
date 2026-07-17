import express from 'express';
import {
  recordSessionMedications,
  listMedications,
  deleteMedication,
  cancelMedication,
  getMedicationHistory,
  getMedicationReport,
  getMedicationBilling,
  getMedicationUsage,
} from '../controllers/medicationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

// Read: any authenticated role (technicians are view-only).
router.get('/', listMedications);
// Full lifecycle trail — biller can watch when meds were added / stopped / removed.
router.get('/history', authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR, ROLES.NURSE), getMedicationHistory);

router.get('/report', authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR), getMedicationReport);
router.get('/usage', authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR), getMedicationUsage);
router.get('/billing', authorize(ROLES.ADMIN, ROLES.BILLER), getMedicationBilling);

// Write: NURSE / DOCTOR / ADMIN only. Technician has NO medication write access.
// Medications are add + delete (soft) only — no in-place edit.
router.post('/session/:sessionId', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR), recordSessionMedications);
router.patch('/:id/cancel', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR), cancelMedication);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR), deleteMedication);

export default router;
