import asyncHandler from 'express-async-handler';
import HomeMedication from '../models/HomeMedication.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/)
    ? Patient.findById(idOrMrn)
    : Patient.findOne({ mrn: idOrMrn });

/**
 * GET /api/v1/patients/:idOrMrn/home-medications
 * List a patient's home medications (active first, newest first).
 */
export const listHomeMedications = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const filter = { patient: patient._id };
  if (!req.query.includeInactive) filter.status = { $ne: 'deleted' };
  const meds = await HomeMedication.find(filter)
    .sort({ status: 1, updatedAt: -1 })
    .lean();

  res.json({ success: true, data: meds, meta: { total: meds.length }, message: 'Home medications fetched', errors: [] });
});

/**
 * POST /api/v1/patients/:idOrMrn/home-medications
 * Add a home medication (nurse / doctor / admin).
 * body: { name, dose, unit, route, frequency, quantity, prescribedBy, startDate, endDate, notes }
 */
export const addHomeMedication = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) throw new ApiError(400, 'Medication name is required');

  const doc = await HomeMedication.create({
    patient: patient._id,
    patientMrn: patient.mrn,
    name: String(b.name).trim(),
    dose: Number(b.dose) || 0,
    unit: b.unit || 'mg',
    route: b.route || 'Oral',
    frequency: b.frequency || 'Once daily',
    quantity: Number(b.quantity) || 1,
    prescribedBy: b.prescribedBy || '',
    startDate: b.startDate ? new Date(b.startDate) : undefined,
    endDate: b.endDate ? new Date(b.endDate) : undefined,
    status: b.status === 'discontinued' ? 'discontinued' : 'active',
    notes: b.notes || '',
    addedAt: new Date(),
    addedBy: req.user._id,
    addedByName: req.user.name,
    addedByRole: req.user.role,
  });

  res.status(201).json({ success: true, data: doc, message: 'Home medication added', errors: [] });
});

/**
 * PATCH /api/v1/home-medications/:id
 * Edit a home medication or discontinue it (nurse / doctor / admin).
 */
export const updateHomeMedication = asyncHandler(async (req, res) => {
  const med = await HomeMedication.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Home medication not found');

  const b = req.body || {};
  const fields = ['name', 'unit', 'route', 'frequency', 'prescribedBy', 'notes', 'status'];
  fields.forEach((f) => { if (b[f] !== undefined) med[f] = b[f]; });
  if (b.dose !== undefined) med.dose = Number(b.dose) || 0;
  if (b.quantity !== undefined) med.quantity = Number(b.quantity) || 1;
  if (b.startDate !== undefined) med.startDate = b.startDate ? new Date(b.startDate) : undefined;
  if (b.endDate !== undefined) med.endDate = b.endDate ? new Date(b.endDate) : undefined;

  // Stamp the stop trail when moving to discontinued/cancelled.
  if ((med.status === 'discontinued' || med.status === 'cancelled') && !med.cancelledAt) {
    med.cancelledAt = new Date();
    med.cancelledBy = req.user._id;
    med.cancelledByName = req.user.name;
    med.cancelledByRole = req.user.role;
    if (b.cancelReason) med.cancelReason = String(b.cancelReason).trim();
    if (!med.endDate) med.endDate = new Date();
  }
  // Reactivating clears the stop trail.
  if (med.status === 'active') {
    med.cancelledAt = undefined; med.cancelledBy = undefined;
    med.cancelledByName = undefined; med.cancelledByRole = undefined;
    med.cancelReason = undefined; med.endDate = undefined;
  }

  await med.save();
  res.json({ success: true, data: med, message: 'Home medication updated', errors: [] });
});

/**
 * DELETE /api/v1/home-medications/:id  (admin only)
 */
export const deleteHomeMedication = asyncHandler(async (req, res) => {
  const med = await HomeMedication.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Home medication not found');

  // SOFT delete — keep the record with a trail.
  med.status = 'deleted';
  med.deletedAt = new Date();
  med.deletedBy = req.user._id;
  med.deletedByName = req.user.name;
  med.deletedByRole = req.user.role;
  await med.save();

  res.json({ success: true, data: med, message: 'Home medication removed (history kept)', errors: [] });
});
