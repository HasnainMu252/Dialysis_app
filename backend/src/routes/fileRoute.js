import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, authorize } from '../middleware/auth.js';
import { ALL_STAFF_ROLES } from '../utils/constants.js';
import { ApiError } from '../utils/apiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../uploads');

const router = express.Router();

// All authenticated staff may stream patient documents (patient role excluded).
router.use(protect, authorize(...ALL_STAFF_ROLES));

router.get('/:folder/:filename', (req, res, next) => {
  try {
    const { folder, filename } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(folder) || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
      throw new ApiError(400, 'Invalid file path');
    }

    const filePath = path.resolve(uploadsRoot, folder, filename);
    if (!filePath.startsWith(uploadsRoot)) throw new ApiError(400, 'Invalid file path');
    if (!fs.existsSync(filePath)) throw new ApiError(404, 'File not found');

    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

export default router;
