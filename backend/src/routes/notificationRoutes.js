import express from 'express';
import {
  forceNotification,
  getMyNotifications,
  markNotificationAsRead,
  testInsuranceExpiryNotification,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);

router.post(
  '/force',
  authorize(ROLES.ADMIN),
  forceNotification
);

router.post(
  '/test-insurance-expiry',
  authorize(ROLES.ADMIN, ROLES.BILLER),
  testInsuranceExpiryNotification
);

router.patch('/:id/read', markNotificationAsRead);

export default router;