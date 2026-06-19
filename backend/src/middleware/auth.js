import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export const protect = asyncHandler(async (req,res,next)=>{
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null;
  if(!token) throw new ApiError(401,'Not authorized, token missing');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select('-password');
  if(!req.user || !req.user.isActive) throw new ApiError(401,'User not active or not found');
  next();
});
export const authorize = (...roles)=>(req,res,next)=>{
  if(!roles.includes(req.user.role)) throw new ApiError(403,'Forbidden: insufficient role');
  next();
};
