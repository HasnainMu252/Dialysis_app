import asyncHandler from 'express-async-handler';
import DialysisPrescription from '../models/DialysisPrescription.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/) ? Patient.findById(idOrMrn) : Patient.findOne({ mrn: idOrMrn });

const ORDER_FIELDS = [
  'frequency', 'duration', 'bathOrderType', 'bath', 'bathOther', 'bicarb', 'bicarbOther',
  'sodium', 'sodiumOther', 'sodiumVariation', 'sodiumModeling', 'dialyzer', 'dialyzerOther',
  'temperature', 'bloodFlowRate', 'bloodFlowRateOther', 'dialysateFlowRate', 'dialysateFlowRateOther',
  'fluidRemoval', 'fluidRemovalOther', 'tubing', 'tubingOther', 'needleSize',
  'accessSite', 'accessSiteOther', 'abnormalPotassium', 'abnormalSodium', 'comments',
];

/**
 * GET /api/v1/patients/:idOrMrn/dialysis-prescription
 * Returns the current active prescription (any authenticated role).
 */
export const getActivePrescription = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const active = await DialysisPrescription.findOne({ patient: patient._id, status: 'active' })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: active || null, message: 'Active dialysis prescription', errors: [] });
});

/**
 * GET /api/v1/patients/:idOrMrn/dialysis-prescription/history
 * Full history (newest first).
 */
export const getPrescriptionHistory = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const list = await DialysisPrescription.find({ patient: patient._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: list, meta: { total: list.length }, message: 'Prescription history', errors: [] });
});

/**
 * POST /api/v1/patients/:idOrMrn/dialysis-prescription
 * DOCTOR only. Creates a new active prescription and supersedes the previous
 * active one (kept as history).
 */
export const upsertPrescription = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const b = req.body || {};
  if (!b.bath || !String(b.bath).trim()) throw new ApiError(400, 'Bath is required');
  if (!b.accessSite || !String(b.accessSite).trim()) throw new ApiError(400, 'Access site is required');

  const doc = {
    patient: patient._id,
    patientMrn: patient.mrn,
    status: 'active',
    prescribedBy: req.user._id,
    prescribedByName: req.user.name,
    prescribedAt: new Date(),
  };
  ORDER_FIELDS.forEach((f) => { if (b[f] !== undefined) doc[f] = b[f]; });
  if (b.minimumSystolic !== undefined && b.minimumSystolic !== '') {
    doc.minimumSystolic = Number(b.minimumSystolic);
  }

  // Supersede the current active order, keeping it as history.
  await DialysisPrescription.updateMany(
    { patient: patient._id, status: 'active' },
    { $set: { status: 'superseded', supersededAt: new Date() } }
  );

  const created = await DialysisPrescription.create(doc);

  await writeAudit({
    user: req.user,
    action: 'dialysisPrescription.upsert',
    entity: 'DialysisPrescription',
    entityId: created._id,
  });

  res.status(201).json({ success: true, data: created, message: 'Dialysis prescription saved', errors: [] });
});

/**
 * GET /api/v1/dialysis-prescriptions/active-patient-ids
 * Returns the set of patient ids that currently have an active prescription,
 * plus the total. Used by the doctor dashboard for stats and per-row badges
 * without fetching every prescription.
 */
export const getActivePrescriptionPatientIds = asyncHandler(async (req, res) => {
  const actives = await DialysisPrescription.find({ status: 'active' })
    .select('patient')
    .lean();
  const patientIds = [...new Set(actives.map((a) => String(a.patient)))];
  res.json({ success: true, data: { patientIds, total: patientIds.length }, message: 'Active prescription patients', errors: [] });
});
