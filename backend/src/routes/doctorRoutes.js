import express from 'express';
import {
  createDoctorCheckup,
  createMissingRoundNotifications,
  deleteDoctorCheckupDocument,
  getDoctorPatientDetail,
  getDoctorPatients,
  getMonthlyRoundStatus,
  getPatientDoctorCheckups,
  updateDoctorCheckup,
  uploadDoctorCheckupDocuments,
  batchCreateCheckups,
  batchUpdateCheckups,
  listAllCheckups,
  updateCheckupApproval,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadDoctorDocument } from '../middleware/uploadDoctorDocument.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

// Flat checkup list + batch operations (declared before /patients to avoid clashes)
router.get(
  '/checkups',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.BILLER),
  listAllCheckups
);

router.post(
  '/checkups/batch',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  batchCreateCheckups
);

router.patch(
  '/checkups/batch',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  batchUpdateCheckups
);

router.patch(
  '/checkups/:id/approval',
  authorize(ROLES.ADMIN, ROLES.BILLER),
  updateCheckupApproval
);

router.get(
  '/patients',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  getDoctorPatients
);

router.get(
  '/patients/:patientId',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  getDoctorPatientDetail
);

router.post(
  '/patients/:patientId/checkups',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  createDoctorCheckup
);

router.get(
  '/patients/:patientId/checkups',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.BILLER, ROLES.NURSE),
  getPatientDoctorCheckups
);

router.get(
  '/patients/:patientId/monthly-status',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.BILLER, ROLES.NURSE),
  getMonthlyRoundStatus
);

router.patch(
  '/checkups/:id',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  updateDoctorCheckup
);

router.post(
  '/checkups/:id/documents',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  uploadDoctorDocument.array('documents', 10),
  uploadDoctorCheckupDocuments
);

router.delete(
  '/checkups/:id/documents/:documentId',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  deleteDoctorCheckupDocument
);

router.post(
  '/missing-round-notifications',
  authorize(ROLES.ADMIN),
  createMissingRoundNotifications
);

export default router;