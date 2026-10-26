import express from 'express';
import {
  createOrder,
  listOrders,
  updateOrder,
  deleteOrder,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

// Doctor places orders; Nurse carries out and completes them. Visible to
// doctor, nurse and admin only.
router.get('/', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE), listOrders);
router.post('/', authorize(ROLES.ADMIN, ROLES.DOCTOR), createOrder);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE), updateOrder);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.DOCTOR), deleteOrder);

export default router;
