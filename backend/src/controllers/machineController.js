import asyncHandler from 'express-async-handler';
import Machine from '../models/Machine.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

/** GET /api/v1/machines */
export const listMachines = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  const machines = await Machine.find(q).populate('chair', 'code chairNumber').sort('machineCode').lean();
  res.json({ success: true, data: machines, meta: { total: machines.length }, message: 'Machines', errors: [] });
});

/** GET /api/v1/machines/:id */
export const getMachine = asyncHandler(async (req, res) => {
  const machine = await Machine.findById(req.params.id).populate('chair', 'code chairNumber');
  if (!machine) throw new ApiError(404, 'Machine not found');
  res.json({ success: true, data: machine, message: 'Machine', errors: [] });
});

/** POST /api/v1/machines */
export const createMachine = asyncHandler(async (req, res) => {
  const { machineCode } = req.body || {};
  if (!String(machineCode || '').trim()) throw new ApiError(400, 'Machine code is required');

  const exists = await Machine.findOne({ machineCode: String(machineCode).trim() });
  if (exists) throw new ApiError(409, 'A machine with this code already exists');

  const machine = await Machine.create({ ...req.body, machineCode: String(machineCode).trim() });
  await writeAudit({ user: req.user, action: 'machine.create', entity: 'Machine', entityId: machine._id });
  res.status(201).json({ success: true, data: machine, message: 'Machine created', errors: [] });
});

/** PATCH /api/v1/machines/:id */
export const updateMachine = asyncHandler(async (req, res) => {
  const { maintenance, ...rest } = req.body || {}; // maintenance is managed via its own route
  const machine = await Machine.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!machine) throw new ApiError(404, 'Machine not found');
  await writeAudit({ user: req.user, action: 'machine.update', entity: 'Machine', entityId: machine._id });
  res.json({ success: true, data: machine, message: 'Machine updated', errors: [] });
});

/** DELETE /api/v1/machines/:id */
export const deleteMachine = asyncHandler(async (req, res) => {
  const machine = await Machine.findByIdAndDelete(req.params.id);
  if (!machine) throw new ApiError(404, 'Machine not found');
  await writeAudit({ user: req.user, action: 'machine.delete', entity: 'Machine', entityId: req.params.id });
  res.json({ success: true, data: { id: req.params.id }, message: 'Machine deleted', errors: [] });
});

/** POST /api/v1/machines/:id/maintenance  — add a maintenance record */
export const addMaintenance = asyncHandler(async (req, res) => {
  const machine = await Machine.findById(req.params.id);
  if (!machine) throw new ApiError(404, 'Machine not found');

  const { date, type = '', note = '', performedByName = '', status } = req.body || {};
  const when = date ? new Date(date) : new Date();

  machine.maintenance.push({
    date: when,
    type: String(type).trim(),
    note: String(note).trim(),
    performedByName: String(performedByName).trim(),
    by: req.user?._id,
    byName: req.user?.name,
  });
  machine.lastMaintenanceAt = when;
  if (status && ['available', 'in_use', 'maintenance', 'out_of_order'].includes(status)) {
    machine.status = status;
  }
  await machine.save();

  await writeAudit({ user: req.user, action: 'machine.maintenance.add', entity: 'Machine', entityId: machine._id });
  res.json({ success: true, data: machine, message: 'Maintenance record added', errors: [] });
});
