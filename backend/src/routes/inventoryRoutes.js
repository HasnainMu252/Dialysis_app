import express from 'express';
import {
  listInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  addTransaction,
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();
router.use(protect, authorize(...PERMISSIONS.inventoryManage));

router.get('/', listInventory);
router.post('/', createInventory);
router.patch('/:id', updateInventory);
router.delete('/:id', deleteInventory);
router.post('/:id/transaction', addTransaction);

export default router;
