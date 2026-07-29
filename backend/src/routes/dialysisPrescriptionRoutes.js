import express from 'express';
import { getActivePrescriptionPatientIds } from '../controllers/dialysisPrescriptionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

router.get('/active-patient-ids', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.TECHNICIAN), getActivePrescriptionPatientIds);

export default router;
