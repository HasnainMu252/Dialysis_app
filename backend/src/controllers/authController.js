import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/response.js';
import { verifyTotp } from '../utils/totp.js';
import { assertStrongPassword } from '../utils/passwordPolicy.js';

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
  mfaEnabled: user.mfaEnabled,
});

export const registerUser = asyncHandler(async (req, res) => {
  assertStrongPassword(req.body.password);
  const user = await User.create(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user: publicUser(user), token: sign(user._id) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, mfaToken } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() })
    .select('+password +failedLoginAttempts +lockUntil +mfaSecret');

  if (!user) throw new ApiError(401, 'Invalid email or password');

  // Account lockout after repeated failures (brute-force protection)
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Account locked due to failed attempts. Try again in ${mins} minute(s).`);
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) throw new ApiError(403, 'Account is inactive');

  // Opt-in MFA: if enabled, a valid TOTP code is required to complete login.
  if (user.mfaEnabled) {
    if (!mfaToken) {
      return sendSuccess(res, { message: 'MFA code required', data: { mfaRequired: true } });
    }
    if (!verifyTotp(user.mfaSecret, mfaToken)) {
      throw new ApiError(401, 'Invalid MFA code');
    }
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  return sendSuccess(res, {
    message: 'Login successful',
    data: { ...publicUser(user), token: sign(user._id) },
  });
});

export const me = asyncHandler(async (req, res) => sendSuccess(res, { data: req.user }));

// ---- Multi-Factor Authentication (opt-in TOTP) ----
import { generateBase32Secret, buildOtpAuthUrl } from '../utils/totp.js';

/**
 * POST /api/v1/auth/mfa/setup
 * Generates a secret + otpauth URL for the authenticator app.
 * MFA is only turned on after the user confirms a code via /mfa/enable.
 */
export const setupMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaSecret');
  const secret = generateBase32Secret();
  user.mfaSecret = secret;
  user.mfaEnabled = false;
  await user.save();
  return sendSuccess(res, {
    message: 'Scan this in your authenticator app, then confirm a code to enable MFA.',
    data: { secret, otpauthUrl: buildOtpAuthUrl(secret, user.email) },
  });
});

/**
 * POST /api/v1/auth/mfa/enable  { token }
 * Confirms the first code and turns MFA on.
 */
export const enableMfa = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+mfaSecret');
  if (!user.mfaSecret) throw new ApiError(400, 'Run MFA setup first');
  if (!verifyTotp(user.mfaSecret, token)) throw new ApiError(401, 'Invalid code');
  user.mfaEnabled = true;
  await user.save();
  return sendSuccess(res, { message: 'MFA enabled', data: { mfaEnabled: true } });
});

/**
 * POST /api/v1/auth/mfa/disable  { token }
 * Requires a valid code to switch MFA off.
 */
export const disableMfa = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+mfaSecret');
  if (user.mfaEnabled && !verifyTotp(user.mfaSecret, token)) throw new ApiError(401, 'Invalid code');
  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  await user.save();
  return sendSuccess(res, { message: 'MFA disabled', data: { mfaEnabled: false } });
});
