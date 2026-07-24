import mongoose from 'mongoose';
import { SESSION_STATUS } from '../utils/constants.js';

const vitalsSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: ['before', 'during', 'after'],
      required: true,
    },
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    weight: Number,
    spo2: Number,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const soapSchema = new mongoose.Schema(
  {
    access: { type: String, trim: true, default: '' },
    accessOther: { type: String, trim: true, default: '' },
    subjective: String,
    objective: String,
    assessment: String,
    plan: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
      unique: true,
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    chair: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chair',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: SESSION_STATUS,
      default: 'scheduled',
      index: true,
    },

    queueNumber: Number,

    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    startedAt: Date,
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    completedAt: Date,

    /**
     * Technician submits the finished dialysis for nurse review.
     * The session sits at status 'pending_review' until a nurse signs it off.
     */
    submittedForReviewAt: Date,
    submittedForReviewBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedForReviewByName: { type: String, trim: true },
    submittedForReviewByRole: { type: String, trim: true },
    submissionNotes: { type: String, trim: true },

    /**
     * Nurse's final sign-off. `signatureName` is the nurse's typed digital
     * signature; stored with identity + timestamp so the close is attributable.
     */
    nurseReview: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedByName: { type: String, trim: true },
      reviewedByRole: { type: String, trim: true },
      reviewedAt: Date,
      signatureName: { type: String, trim: true },
      attested: { type: Boolean, default: false },
      reviewNotes: { type: String, trim: true },
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    vitals: [vitalsSchema],
    soapNotes: [soapSchema],

    /**
     * Technician observations recorded DURING dialysis.
     * Technicians cannot touch medications — this is their write surface.
     * accessType captures how the patient was accessed (e.g. Fistula), plus a
     * free-text comment. Shown alongside SOAP in the session detail so nurses
     * and doctors can see them.
     */
    technicianNotes: [
      new mongoose.Schema(
        {
          accessType: {
            type: String,
            trim: true,
            default: '',
          },
          // Free text when accessType is "Other".
          accessOther: { type: String, trim: true, default: '' },
          comment: { type: String, trim: true },
          authorName: String,
          authorRole: String,
          author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          createdAt: { type: Date, default: Date.now },
        },
        { _id: true }
      ),
    ],

    documents: [
      new mongoose.Schema(
        {
          name: String,
          fileUrl: { type: String, required: true },
          mimeType: String,
          notes: String,
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          uploadedAt: { type: Date, default: Date.now },
        },
        { _id: true }
      ),
    ],

    treatmentSummary: String,
    sentToBillerAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('DialysisSession', sessionSchema);