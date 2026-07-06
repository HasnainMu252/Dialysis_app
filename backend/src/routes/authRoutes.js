import express from 'express';
import { z } from 'zod';
import { login, me, registerUser, setupMfa, enableMfa, disableMfa } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(Object.values(ROLES)),
  phone: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
  mfaToken: z.string().trim().max(10).optional(),
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/register', authLimiter, validate(registerSchema), registerUser);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, me);

// Multi-factor authentication (opt-in)
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/enable', protect, enableMfa);
router.post('/mfa/disable', protect, disableMfa);

export default router;
