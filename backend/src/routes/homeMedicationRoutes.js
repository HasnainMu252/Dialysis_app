import express from 'express';
import {
  updateHomeMedication,
  deleteHomeMedication,
} from '../controllers/homeMedicationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

// Nurse, doctor and admin can edit / discontinue.
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR), updateHomeMedication);
// Only admin can hard-delete.
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR), deleteHomeMedication);

export default router;
