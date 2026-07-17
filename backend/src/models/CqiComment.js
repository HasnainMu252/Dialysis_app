import mongoose from 'mongoose';

/**
 * CQI (Continuous Quality Improvement) comment for a patient.
 * Authored by a nurse, technician or social worker — each role keeps its OWN
 * comment per patient which that author can add and update. Usable during and
 * after dialysis, so it is patient-scoped (session is optional context).
 */
const cqiCommentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientMrn: { type: String, index: true },

    // Optional dialysis session this comment was captured during.
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'DialysisSession' },

    comment: { type: String, trim: true, default: '' },
    phase: { type: String, enum: ['during', 'after', 'general'], default: 'general' },

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true },
    authorRole: { type: String, trim: true, index: true }, // nurse | technician | social_worker

    lastEditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One comment per (patient, author). Upserting keeps each author's single
// editable comment rather than spawning duplicates.
cqiCommentSchema.index({ patient: 1, author: 1 }, { unique: true });

export default mongoose.model('CqiComment', cqiCommentSchema);
