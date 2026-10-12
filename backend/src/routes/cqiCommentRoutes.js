import express from 'express';
import {
  deleteCqiComment,
  updateCqiComment,
  listAllCqiComments,
} from '../controllers/cqiCommentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();
router.use(protect);

// CQI review across all patients — admin / DON own the monthly review, and the
// doctor sees the same systematic list on their CQI page.
router.get('/', authorize(...PERMISSIONS.cqiReview, ROLES.DOCTOR), listAllCqiComments);

// Edit / delete a single CQI entry (author or admin).
router.patch('/:id', authorize(...PERMISSIONS.cqiAuthors, ROLES.ADMIN), updateCqiComment);
router.delete('/:id', authorize(...PERMISSIONS.cqiAuthors, ROLES.ADMIN), deleteCqiComment);

export default router;
