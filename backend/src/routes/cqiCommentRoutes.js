import express from 'express';
import { deleteCqiComment } from '../controllers/cqiCommentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();
router.use(protect);

router.delete('/:id', authorize(ROLES.NURSE, ROLES.TECHNICIAN, ROLES.SOCIAL_WORKER, ROLES.ADMIN), deleteCqiComment);

export default router;
