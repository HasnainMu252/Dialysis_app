import mongoose from 'mongoose';

/**
 * A laboratory report for a patient.
 *
 * Can be uploaded in two contexts:
 *   1. During dialysis  -> `session` is set (captured in the Treatment Workflow)
 *   2. Separately       -> `session` is null (patient-level, any time)
 *
 * Only nurses and doctors may upload; every other role is read-only.
 * Uploader identity and timestamp are always recorded.
 */
const labFileSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },       // original filename
    fileUrl: { type: String, trim: true },    // stored path
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 },
  },
  { _id: true }
);

const labReportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientMrn: { type: String, index: true },

    // Set when the lab was uploaded during a dialysis session.
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'DialysisSession', default: null, index: true },

    testName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' }, // e.g. CBC, KFT, LFT, free text
    testDate: { type: Date },
    result: { type: String, trim: true, default: '' },   // summary / values
    notes: { type: String, trim: true, default: '' },

    files: [labFileSchema],

    // ---- who / when trail ----
    uploadedAt: { type: Date, default: Date.now, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: { type: String, trim: true },
    uploadedByRole: { type: String, trim: true }, // 'nurse' | 'doctor' | 'admin'

    // Soft delete — the record is never lost.
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedByName: { type: String, trim: true },
    deletedByRole: { type: String, trim: true },
  },
  { timestamps: true }
);

labReportSchema.index({ patient: 1, uploadedAt: -1 });

export default mongoose.model('LabReport', labReportSchema);
