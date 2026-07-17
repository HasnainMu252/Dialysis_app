import express from 'express';
import {
  addSoap,
  addVitals,
  checkIn,
  completeSession,
  listSessions,
  startSession,
  uploadSessionDocuments,
  addTechnicianNote,
  deleteTechnicianNote,
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';
import uploadSessionDocument from '../middleware/uploadSessionDocument.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

const clinical = authorize(ROLES.NURSE, ROLES.ADMIN, ROLES.TECHNICIAN);
// Technicians CAN add notes during dialysis (their only write surface here).
const noteAuthors = authorize(ROLES.NURSE, ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.DOCTOR);

router.get('/', listSessions);
router.patch('/:id/check-in', clinical, checkIn);
router.patch('/:id/start', clinical, startSession);
router.post('/:id/vitals', clinical, addVitals);
router.post('/:id/soap', clinical, addSoap);
router.post('/:id/documents', clinical, uploadSessionDocument.array('documents', 10), uploadSessionDocuments);
router.patch('/:id/complete', clinical, completeSession);

router.post('/:id/technician-notes', noteAuthors, addTechnicianNote);
router.delete('/:id/technician-notes/:noteId', noteAuthors, deleteTechnicianNote);

export default router;
