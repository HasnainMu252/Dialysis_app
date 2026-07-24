import express from 'express';
import {
  listLabReports,
  uploadLabReport,
  deleteLabReport,
} from '../controllers/labController.js';
import { protect, authorize } from '../middleware/auth.js';
import uploadLab from '../middleware/uploadLabReport.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

// Read: every authenticated role (all non-uploaders are view-only).
router.get('/', listLabReports);

// Write: NURSE and DOCTOR only (admin allowed).
const labUploaders = authorize(ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR);
router.post('/', labUploaders, uploadLab.array('files', 10), uploadLabReport);
router.delete('/:id', labUploaders, deleteLabReport);

export default router;
