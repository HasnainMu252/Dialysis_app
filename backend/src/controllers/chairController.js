import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Chair from '../models/Chair.js';
import { writeAudit } from '../utils/audit.js';

const findChairByIdOrNumber = async (idOrNumber) => {
  const value = idOrNumber.trim().toUpperCase();

  const query = mongoose.Types.ObjectId.isValid(value)
    ? { _id: value }
    : {
        $or: [{ chairNumber: value }, { code: value }],
      };

  return Chair.findOne(query);
};

export const createChair = asyncHandler(async (req, res) => {
  const chair = await Chair.create(req.body);

  await writeAudit({
    user: req.user,
    action: 'chair.create',
    entity: 'Chair',
    entityId: chair._id,
    details: { chairNumber: chair.chairNumber },
  });

  res.status(201).json({
    success: true,
    data: chair,
  });
});

export const listChairs = asyncHandler(async (req, res) => {
  const chairs = await Chair.find().sort('chairNumber');

  res.json({
    success: true,
    data: chairs,
  });
});

export const updateChairStatus = asyncHandler(async (req, res) => {
  const chair = await findChairByIdOrNumber(req.params.idOrNumber);

  if (!chair) {
    res.status(404);
    throw new Error('Chair not found');
  }

  chair.status = req.body.status;

  if (req.body.conditionNotes !== undefined) {
    chair.conditionNotes = req.body.conditionNotes;
  }

  if (req.body.status === 'available') {
    chair.currentSession = null;
  }

  if (req.body.status === 'available' && req.body.cleaned) {
    chair.lastCleanedAt = new Date();
  }

  if (req.body.status === 'maintenance') {
    chair.lastMaintenanceAt = new Date();
  }

  const data = await chair.save();

  await writeAudit({
    user: req.user,
    action: 'chair.status_update',
    entity: 'Chair',
    entityId: chair._id,
    details: {
      chairNumber: chair.chairNumber,
      status: chair.status,
      conditionNotes: chair.conditionNotes,
    },
  });

  res.json({
    success: true,
    data,
  });
});