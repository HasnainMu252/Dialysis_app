import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Canonical uploads root: <backend>/uploads, resolved from this file's location
 * so it does not depend on where the process was started from.
 */
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

/** Secondary location used when the process is started from another directory. */
const CWD_UPLOADS = path.resolve(process.cwd(), 'uploads');

/** Ensure a sub-folder of the uploads root exists and return its absolute path. */
export const ensureUploadDir = (folder) => {
  const dir = path.join(UPLOADS_ROOT, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/**
 * Resolve an uploaded file for serving. Checks the canonical root first, then
 * the cwd-relative folder, so files written by a process started elsewhere are
 * still found instead of 404ing.
 */
export const resolveUploadFile = (folder, filename) => {
  const candidates = [
    path.resolve(UPLOADS_ROOT, folder, filename),
    path.resolve(CWD_UPLOADS, folder, filename),
  ];

  for (const candidate of candidates) {
    const base = candidate.startsWith(UPLOADS_ROOT) ? UPLOADS_ROOT : CWD_UPLOADS;
    if (!candidate.startsWith(base)) continue; // traversal guard
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};
