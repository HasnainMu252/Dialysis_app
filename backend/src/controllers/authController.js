import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/response.js';

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
});

export const registerUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user: publicUser(user), token: sign(user._id) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'Account is inactive');
  return sendSuccess(res, {
    message: 'Login successful',
    data: { ...publicUser(user), token: sign(user._id) },
  });
});

export const me = asyncHandler(async (req, res) => sendSuccess(res, { data: req.user }));
