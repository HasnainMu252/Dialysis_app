import multer from 'multer';
import path from 'path';
import { ensureUploadDir } from '../utils/uploadsPath.js';

const uploadPath = ensureUploadDir('lab-reports');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Images + documents: png, jpg/jpeg, webp, pdf, doc/docx, xls/xlsx, csv, txt
const allowedTypes = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

const allowedExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

const uploadLabReport = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Allowed file types: images (PNG, JPG, WEBP), PDF, Word, Excel, CSV and TXT'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export default uploadLabReport;
