import asyncHandler from 'express-async-handler';
import LabReport from '../models/LabReport.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/) ? Patient.findById(idOrMrn) : Patient.findOne({ mrn: idOrMrn });

/**
 * GET /api/v1/labs?patient=&session=&includeInactive=
 * List lab reports. Any authenticated role may read.
 */
export const listLabReports = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.patient) {
    const pt = await resolvePatient(req.query.patient);
    if (!pt) throw new ApiError(404, 'Patient not found');
    query.patient = pt._id;
  }
  if (req.query.session) query.session = req.query.session;
  if (!req.query.includeInactive) query.status = { $ne: 'deleted' };

  const labs = await LabReport.find(query)
    .populate('patient', 'mrn firstName lastName')
    .sort({ uploadedAt: -1 })
    .lean();

  res.json({ success: true, data: labs, meta: { total: labs.length }, message: 'Lab reports fetched', errors: [] });
});

/**
 * POST /api/v1/labs   (multipart: files[] + fields)
 * Upload a lab report. NURSE and DOCTOR only (admin allowed).
 * body: { patient, session?, testName, category?, testDate?, result?, notes? }
 *
 * `session` set  -> uploaded during dialysis
 * `session` null -> standalone / separate upload
 */
export const uploadLabReport = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.patient) throw new ApiError(400, 'Patient is required');
  if (!b.testName || !String(b.testName).trim()) throw new ApiError(400, 'Test name is required');

  const patient = await resolvePatient(b.patient);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const files = (req.files || []).map((file) => ({
    name: file.originalname,
    fileUrl: `/uploads/lab-reports/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
  }));

  const lab = await LabReport.create({
    patient: patient._id,
    patientMrn: patient.mrn,
    session: b.session || null,
    testName: String(b.testName).trim(),
    category: b.category || '',
    testDate: b.testDate ? new Date(b.testDate) : new Date(),
    result: b.result || '',
    notes: b.notes || '',
    files,
    uploadedAt: new Date(),
    uploadedBy: req.user._id,
    uploadedByName: req.user.name,
    uploadedByRole: req.user.role,
  });

  await writeAudit({
    user: req.user,
    action: 'lab.upload',
    entity: 'LabReport',
    entityId: lab._id,
  });

  res.status(201).json({ success: true, data: lab, message: 'Lab report uploaded', errors: [] });
});

/**
 * DELETE /api/v1/labs/:id
 * SOFT delete — keeps the record with a who/when trail. Nurse / doctor / admin.
 */
export const deleteLabReport = asyncHandler(async (req, res) => {
  const lab = await LabReport.findById(req.params.id);
  if (!lab) throw new ApiError(404, 'Lab report not found');

  lab.status = 'deleted';
  lab.deletedAt = new Date();
  lab.deletedBy = req.user._id;
  lab.deletedByName = req.user.name;
  lab.deletedByRole = req.user.role;
  await lab.save();

  await writeAudit({
    user: req.user,
    action: 'lab.delete',
    entity: 'LabReport',
    entityId: lab._id,
  });

  res.json({ success: true, data: lab, message: 'Lab report removed (history kept)', errors: [] });
});
