import mongoose from 'mongoose';

/**
 * CQI (Continuous Quality Improvement) comment for a patient.
 * An append log: clinical roles who meet the patient (nurse, technician,
 * social worker, doctor, dietitian) record entries over time; admin/DON review
 * them monthly. Patient-scoped (session is optional context).
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

// CQI is an append log: each author may record many entries per patient over
// time (reviewed monthly), so entries are indexed but NOT unique per author.
cqiCommentSchema.index({ patient: 1, createdAt: -1 });
cqiCommentSchema.index({ createdAt: -1 });

export default mongoose.model('CqiComment', cqiCommentSchema);
