import express from 'express';
import {
  listMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  addMaintenance,
} from '../controllers/machineController.js';
import { protect, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();
router.use(protect);

// Biomed + admin manage machines; everyone authenticated may read the registry.
router.get('/', listMachines);
router.get('/:id', getMachine);
router.post('/', authorize(...PERMISSIONS.machineManage), createMachine);
router.patch('/:id', authorize(...PERMISSIONS.machineManage), updateMachine);
router.delete('/:id', authorize(...PERMISSIONS.machineManage), deleteMachine);
router.post('/:id/maintenance', authorize(...PERMISSIONS.machineManage), addMaintenance);

export default router;
