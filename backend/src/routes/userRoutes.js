import express from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.patch('/:id/password', resetUserPassword);
router.delete('/:id', deleteUser);

export default router;
