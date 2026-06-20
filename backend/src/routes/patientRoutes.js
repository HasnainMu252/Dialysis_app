import express from 'express';
import { z } from 'zod';
import {
  bulkDeletePatients,
  bulkUploadPatients,
  createPatient,
  deletePatient,
  findPatient,
  listPatients,
  sendToBiller,
  updatePatient,
  exportPatients,
} from '../controllers/patientController.js';
import { uploadExcel } from '../middleware/uploadExcel.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

const patientSchema = z.object({
  mrn: z.string().trim().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dob: z.coerce.date().optional(),
  gender: z.string().trim().optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  referralSource: z.string().trim().optional(),
  hospital: z.string().trim().optional(),
  patientType: z.record(z.boolean()).optional(),
  homeFacility: z.record(z.any()).optional(),
  emergencyContact: z.record(z.any()).optional(),
  medicalHistory: z.record(z.any()).optional(),
  registration: z.record(z.any()).optional(),
  insurance: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'transferred', 'deceased']).optional(),
}).passthrough();

const patientUpdateSchema = patientSchema.partial();

router.use(protect);

router.get('/', authorize(...PERMISSIONS.patientReadAll), listPatients);
router.post('/', authorize(...PERMISSIONS.patientWrite), validate(patientSchema), createPatient);
router.post('/bulk-upload', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), uploadExcel.single('file'), bulkUploadPatients);
router.delete('/bulk-delete', authorize(...PERMISSIONS.patientDelete), bulkDeletePatients);
router.get('/export', authorize(...PERMISSIONS.patientReadAll), exportPatients);
router.get('/:id', authorize(...PERMISSIONS.patientReadAll, ROLES.PATIENT), findPatient);
router.patch('/:id', authorize(...PERMISSIONS.patientWrite), validate(patientUpdateSchema), updatePatient);
router.patch('/:id/send-to-biller', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), sendToBiller);
router.delete('/:id', authorize(...PERMISSIONS.patientDelete), deletePatient);

export default router;
