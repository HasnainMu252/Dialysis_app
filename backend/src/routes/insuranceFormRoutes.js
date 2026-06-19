import express from 'express';

import {
  createInsuranceForm,
  getInsuranceFormByPatient,
  updateInsuranceForm,
  deleteInsuranceForm,
  uploadInsuranceDocuments,
  updateInsuranceDocument,
  deleteInsuranceDocument,
  getExpiringInsuranceForms,
} from '../controllers/insuranceFormController.js';

import uploadDocument from '../middleware/uploadDocument.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

const insuranceEditors = [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
];

const insuranceViewers = [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
  ROLES.NURSE,
  ROLES.TECHNICIAN,
  ROLES.SOCIAL_WORKER,
  ROLES.DOCTOR,
];

router.get(
  '/expiring',
  authorize(...insuranceViewers),
  getExpiringInsuranceForms
);

router.post(
  '/patient/:patientId',
  authorize(...insuranceEditors),
  createInsuranceForm
);

router.get(
  '/patient/:patientId',
  authorize(...insuranceViewers),
  getInsuranceFormByPatient
);

router.patch(
  '/:id',
  authorize(...insuranceEditors),
  updateInsuranceForm
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.INSURANCE_PERSON),
  deleteInsuranceForm
);

router.post(
  '/:id/documents',
  authorize(...insuranceEditors),
  uploadDocument.array('documents', 10),
  uploadInsuranceDocuments
);

router.patch(
  '/:id/documents/:documentId',
  authorize(...insuranceEditors),
  updateInsuranceDocument
);

router.delete(
  '/:id/documents/:documentId',
  authorize(ROLES.ADMIN, ROLES.BILLER, ROLES.INSURANCE_PERSON),
  deleteInsuranceDocument
);

export default router;