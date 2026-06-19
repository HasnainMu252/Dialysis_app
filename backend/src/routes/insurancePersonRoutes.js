import express from 'express';
import { getInsurancePersonDashboard } from '../controllers/insurancePersonController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get(
  '/dashboard',
  authorize(
    ROLES.ADMIN,
    ROLES.BILLER,
    ROLES.FRONT_DESK,
    ROLES.INSURANCE_PERSON
  ),
  getInsurancePersonDashboard
);

export default router;