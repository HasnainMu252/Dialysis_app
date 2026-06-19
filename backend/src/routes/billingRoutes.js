import express from 'express';
import {
  createClaim,
  listClaims,
  updateClaim,
  updateInsurance,
} from '../controllers/billingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect, authorize(ROLES.BILLER, ROLES.ADMIN));

router.patch('/insurance/:patientIdOrMrn', updateInsurance);

router.route('/claims').get(listClaims).post(createClaim);

router.patch('/claims/:id', updateClaim);

export default router;