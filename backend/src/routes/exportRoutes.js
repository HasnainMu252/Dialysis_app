import express from 'express';
import { exportExcel } from '../controllers/exportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Any authenticated user can export the themed Excel of a table they can see.
router.post('/excel', exportExcel);

export default router;
