import express from 'express';
import {
  createClaim,
  listClaims,
  updateClaim,
  updateInsurance,
  getActivitySummary,
  getDailyServices,
  getMedReconciliation,
  generateClaims,
  getBillingSummary,
} from '../controllers/billingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

// Biller, admin and DON (DON has billing + reporting access).
router.use(protect, authorize(...PERMISSIONS.billing));

router.patch('/insurance/:patientIdOrMrn', updateInsurance);

router.route('/claims').get(listClaims).post(createClaim);
router.post('/claims/generate-due', generateClaims);
router.patch('/claims/:id', updateClaim);

// Phase D — activity logs (no fees).
router.get('/summary', getBillingSummary);
router.get('/activity', getActivitySummary);
router.get('/daily', getDailyServices);
router.get('/med-reconciliation', getMedReconciliation);

export default router;
