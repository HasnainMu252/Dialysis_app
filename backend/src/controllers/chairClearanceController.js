import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Chair from '../models/Chair.js';
import ChairClearance from '../models/ChairClearance.js';
import { writeAudit } from '../utils/audit.js';

const findChair = async (idOrCode) => {
  if (!idOrCode) return null;

  const value = String(idOrCode).trim();

  const query = {
    $or: [
      { code: value },
      { chairNumber: value },
    ],
  };

  if (mongoose.Types.ObjectId.isValid(value)) {
    query.$or.push({ _id: value });
  }

  return Chair.findOne(query);
};

const buildChecklist = (body) => ({
  chairChecked: body.checklist?.chairChecked ?? body.chairChecked ?? false,
  machineChecked: body.checklist?.machineChecked ?? body.machineChecked ?? false,
  filterChecked: body.checklist?.filterChecked ?? body.filterChecked ?? false,
  solutionChecked: body.checklist?.solutionChecked ?? body.solutionChecked ?? false,
  cleaned: body.checklist?.cleaned ?? body.cleaned ?? false,
  safeForUse: body.checklist?.safeForUse ?? body.safeForUse ?? false,
});

export const createChairClearance = asyncHandler(async (req, res) => {
  const chairCode =
    req.params.chairCode ||
    req.params.chairIdOrCode ||
    req.params.id;

  const chair = await findChair(chairCode);

  if (!chair) {
    return res.status(404).json({
      success: false,
      message: `Chair not found: ${chairCode}`,
    });
  }

  const allowedStatuses = ['available', 'maintenance', 'cleaning', 'out_of_order'];
  const status = req.body.status || 'available';

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
    });
  }

  const checklist = buildChecklist(req.body);
  const notes = req.body.notes || '';

  const clearance = await ChairClearance.create({
    chair: chair._id,
    chairCode: chair.code || chair.chairNumber,
    status,
    checklist,
    notes,
    clearedBy: req.user?._id,
    clearedAt: new Date(),
  });

  chair.status = status;

  if (status === 'available') {
    chair.currentSession = null;
    chair.lastCleanedAt = new Date();
  }

  if (status === 'maintenance') {
    chair.lastMaintenanceAt = new Date();
  }

  if (notes) {
    chair.conditionNotes = notes;
  }

  await chair.save();

  await writeAudit({
    user: req.user,
    action: 'chair.clearance',
    entity: 'ChairClearance',
    entityId: clearance._id,
    details: {
      chairCode: chair.code || chair.chairNumber,
      status,
      notes,
    },
  });

  const populatedClearance = await ChairClearance.findById(clearance._id)
    .populate('chair clearedBy');

  res.status(201).json({
    success: true,
    message: `Chair clearance saved. Chair status changed to ${status}`,
    data: populatedClearance,
    chair: {
      id: chair._id,
      chairNumber: chair.chairNumber,
      code: chair.code,
      name: chair.name,
      status: chair.status,
      location: chair.location,
      lastCleanedAt: chair.lastCleanedAt,
      lastMaintenanceAt: chair.lastMaintenanceAt,
      conditionNotes: chair.conditionNotes,
    },
  });
});

export const listChairClearances = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.chairCode) {
    filter.chairCode = String(req.query.chairCode).trim();
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.chair && mongoose.Types.ObjectId.isValid(req.query.chair)) {
    filter.chair = req.query.chair;
  }

  const data = await ChairClearance.find(filter)
    .populate('chair clearedBy')
    .sort('-createdAt');

  res.json({
    success: true,
    count: data.length,
    data,
  });
});