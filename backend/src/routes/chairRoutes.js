import express from 'express';
import {
  createChair,
  listChairs,
  updateChairStatus,
} from '../controllers/chairController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(listChairs)
  .post(authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.NURSE, ROLES.BIOMED), createChair);

router.patch(
  '/:idOrNumber/status',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.TECHNICIAN, ROLES.NURSE, ROLES.BIOMED),
  updateChairStatus
);

export default router;