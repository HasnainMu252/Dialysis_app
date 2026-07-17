import asyncHandler from 'express-async-handler';
import CqiComment from '../models/CqiComment.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';

const CQI_ROLES = ['nurse', 'technician', 'social_worker'];

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/) ? Patient.findById(idOrMrn) : Patient.findOne({ mrn: idOrMrn });

/**
 * GET /api/v1/patients/:idOrMrn/cqi-comments
 * All CQI comments for a patient (each role's own comment shown together).
 */
export const listCqiComments = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const comments = await CqiComment.find({ patient: patient._id })
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ success: true, data: comments, meta: { total: comments.length }, message: 'CQI comments', errors: [] });
});

/**
 * PUT /api/v1/patients/:idOrMrn/cqi-comments
 * Add or update the CURRENT user's CQI comment for this patient (one per author).
 * Only nurse / technician / social_worker may author.
 * body: { comment, phase, session }
 */
export const upsertCqiComment = asyncHandler(async (req, res) => {
  if (!CQI_ROLES.includes(req.user.role)) {
    throw new ApiError(403, 'Only nurse, technician or social worker can add CQI comments');
  }
  const patient = await resolvePatient(req.params.idOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const { comment = '', phase = 'general', session } = req.body || {};
  if (!String(comment).trim()) throw new ApiError(400, 'Comment is required');

  const doc = await CqiComment.findOneAndUpdate(
    { patient: patient._id, author: req.user._id },
    {
      $set: {
        patientMrn: patient.mrn,
        comment: String(comment).trim(),
        phase: ['during', 'after', 'general'].includes(phase) ? phase : 'general',
        session: session || undefined,
        authorName: req.user.name,
        authorRole: req.user.role,
        lastEditedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, data: doc, message: 'CQI comment saved', errors: [] });
});

/**
 * DELETE /api/v1/cqi-comments/:id
 * Remove a CQI comment. Author may delete their own; admin may delete any.
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
