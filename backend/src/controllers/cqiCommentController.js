import asyncHandler from 'express-async-handler';
import CqiComment from '../models/CqiComment.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { PERMISSIONS } from '../utils/permissions.js';

// Clinical roles who meet the patient and keep CQI notes.
const CQI_ROLES = PERMISSIONS.cqiAuthors;
const PHASES = ['during', 'after', 'general'];

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/) ? Patient.findById(idOrMrn) : Patient.findOne({ mrn: idOrMrn });

/**
 * GET /api/v1/patients/:idOrMrn/cqi-comments
 * The full CQI thread for a patient (every role's entries, newest first).
 */
export const listCqiComments = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const comments = await CqiComment.find({ patient: patient._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: comments, meta: { total: comments.length }, message: 'CQI comments', errors: [] });
});

/**
 * POST/PUT /api/v1/patients/:idOrMrn/cqi-comments
 * Add a NEW CQI comment for this patient (an append log, not a single
 * overwrite). Authored by any clinical role that meets the patient.
 * body: { comment, phase, session }
 */
export const addCqiComment = asyncHandler(async (req, res) => {
  if (!CQI_ROLES.includes(req.user.role)) {
    throw new ApiError(403, 'Your role cannot add CQI comments');
  }
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const { comment = '', phase = 'general', session } = req.body || {};
  if (!String(comment).trim()) throw new ApiError(400, 'Comment is required');

  const doc = await CqiComment.create({
    patient: patient._id,
    patientMrn: patient.mrn,
    comment: String(comment).trim(),
    phase: PHASES.includes(phase) ? phase : 'general',
    session: session || undefined,
    author: req.user._id,
    authorName: req.user.name,
    authorRole: req.user.role,
    lastEditedAt: new Date(),
  });

  res.json({ success: true, data: doc, message: 'CQI comment added', errors: [] });
});

/**
 * PATCH /api/v1/cqi-comments/:id
 * Edit an existing CQI comment. Author may edit their own; admin any.
 */
export const updateCqiComment = asyncHandler(async (req, res) => {
  const doc = await CqiComment.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Comment not found');

  const isOwner = String(doc.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only edit your own CQI comment');
  }

  const { comment, phase } = req.body || {};
  if (comment !== undefined) {
    if (!String(comment).trim()) throw new ApiError(400, 'Comment cannot be empty');
    doc.comment = String(comment).trim();
  }
  if (phase && PHASES.includes(phase)) doc.phase = phase;
  doc.lastEditedAt = new Date();
  await doc.save();

  res.json({ success: true, data: doc, message: 'CQI comment updated', errors: [] });
});

/**
 * DELETE /api/v1/cqi-comments/:id
 * Author may delete their own; admin may delete any.
 */
export const deleteCqiComment = asyncHandler(async (req, res) => {
  const doc = await CqiComment.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Comment not found');

  const isOwner = String(doc.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own CQI comment');
  }

  await doc.deleteOne();
  res.json({ success: true, data: { id: req.params.id }, message: 'CQI comment deleted', errors: [] });
});

/**
 * GET /api/v1/cqi-comments  (admin / DON)
 * Monthly CQI review across ALL patients. Filters: month, year, role, patient.
 */
export const listAllCqiComments = asyncHandler(async (req, res) => {
  const { month, year, role, patient } = req.query;
  const q = {};
  if (role) q.authorRole = role;
  if (patient) q.patient = patient;

  if (year) {
    const y = Number(year);
    if (month) {
      const m = Number(month) - 1;
      q.createdAt = { $gte: new Date(y, m, 1), $lt: new Date(y, m + 1, 1) };
    } else {
      q.createdAt = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
    }
  }

  const comments = await CqiComment.find(q)
    .populate('patient', 'mrn firstName lastName')
    .populate('session', 'status startedAt completedAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: comments, meta: { total: comments.length }, message: 'All CQI comments', errors: [] });
});
