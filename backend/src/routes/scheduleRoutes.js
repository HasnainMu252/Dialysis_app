import express from 'express';
import {
  approveCancel,
  approveSchedule,
  availability,
  createSchedule,
  deleteAllSchedules,
  deleteSchedule,
  getSchedule,
  getSchedulesByPatientMrn,
  getTodaySchedules,
  getUpcomingSchedules,
  listSchedules,
  rejectSchedule,
  requestCancel,
  updateSchedule,
} from '../controllers/scheduleController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get('/', listSchedules);
router.get('/today', getTodaySchedules);
router.get('/upcoming', getUpcomingSchedules);
router.get('/availability', availability);
router.get('/patient/:mrn', getSchedulesByPatientMrn);

router.post('/', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), createSchedule);
router.delete('/', authorize(ROLES.ADMIN), deleteAllSchedules);

router.get('/:code', getSchedule);
router.patch('/:code', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), updateSchedule);
router.delete('/:code', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), deleteSchedule);

router.patch(
  '/:code/cancel',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.NURSE),
  requestCancel
);

router.patch(
  '/:code/cancel/approve',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.NURSE),
  approveCancel
);

router.patch(
  '/:code/approve',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  approveSchedule
);

router.patch(
  '/:code/reject',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  rejectSchedule
);

export default router;