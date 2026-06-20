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
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    vitals: [vitalsSchema],
    soapNotes: [soapSchema],

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