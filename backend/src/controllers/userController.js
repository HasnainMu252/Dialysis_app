import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import User from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../utils/constants.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: users, meta: { total: users.length }, message: 'Users fetched', errors: [] });
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(Object.values(ROLES)),
  phone: z.string().trim().max(30).optional(),
});

export const createUser = asyncHandler(async (req, res) => {
  const payload = createSchema.parse(req.body);
  const exists = await User.findOne({ email: payload.email });
  if (exists) throw new ApiError(409, 'A user with this email already exists');

  const user = await User.create(payload);
  res.status(201).json({ success: true, data: user, message: 'User created', errors: [] });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  phone: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export const updateUser = asyncHandler(async (req, res) => {
  const payload = updateSchema.parse(req.body);
  if (payload.email) {
    const clash = await User.findOne({ email: payload.email, _id: { $ne: req.params.id } });
    if (clash) throw new ApiError(409, 'Another user already uses this email');
  }

  const user = await User.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user, message: 'User updated', errors: [] });
});

const passwordSchema = z.object({ password: z.string().min(8).max(128) });

export const resetUserPassword = asyncHandler(async (req, res) => {
  const { password } = passwordSchema.parse(req.body);
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  user.password = password; // hashed by pre-save hook
  await user.save();
  res.json({ success: true, data: { id: user._id }, message: 'Password updated', errors: [] });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user?._id) === String(req.params.id)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: { id: req.params.id }, message: 'User deleted', errors: [] });
});
