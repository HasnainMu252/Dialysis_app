import express from 'express';
import {
  addSoap,
  addVitals,
  checkIn,
  completeSession,
  listSessions,
  startSession,
  uploadSessionDocuments,
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';
import uploadSessionDocument from '../middleware/uploadSessionDocument.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

const clinical = authorize(ROLES.NURSE, ROLES.ADMIN, ROLES.TECHNICIAN);

router.get('/', listSessions);
router.patch('/:id/check-in', clinical, checkIn);
router.patch('/:id/start', clinical, startSession);
router.post('/:id/vitals', clinical, addVitals);
router.post('/:id/soap', clinical, addSoap);
router.post('/:id/documents', clinical, uploadSessionDocument.array('documents', 10), uploadSessionDocuments);
router.patch('/:id/complete', clinical, completeSession);

export default router;
