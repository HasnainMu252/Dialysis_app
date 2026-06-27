import mongoose from 'mongoose';

const doctorCheckupDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    originalName: String,
    url: { type: String, required: true },
    filePath: String,
    fileType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: String,
    pulse: String,
    temperature: String,
    respiratoryRate: String,
    weight: String,
    oxygenSaturation: String,
  },
  { _id: false }
);

const soapSchema = new mongoose.Schema(
  {
    subjective: { type: String, trim: true },
    objective: { type: String, trim: true },
    assessment: { type: String, trim: true },
    plan: { type: String, trim: true },
    doctorNotes: { type: String, trim: true },
  },
  { _id: false }
);

const doctorCheckupSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    patientMrn: {
      type: String,
      required: true,
      index: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    year: {
      type: Number,
      required: true,
      index: true,
    },

    roundNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },

    checkupDate: {
      type: Date,
      default: Date.now,
    },

    vitals: vitalsSchema,
    soap: soapSchema,

    // ---- Doctor Module V2: structured monthly physician round ----
    // Flexible structured sections (checkbox/dropdown values sent from the form).
    physicianRound: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Multi-disciplinary comments
    doctorComments: { type: String, trim: true },
    socialWorkerComments: { type: String, trim: true },
    dietitianComments: { type: String, trim: true },

    // CQI tracking
    cqi: {
      patient: { type: String, trim: true, default: '' },
      social: { type: String, trim: true, default: '' },
      dietitian: { type: String, trim: true, default: '' },
    },

    templateUsed: { type: String, trim: true },

    // Biller approval workflow
    approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      history: [
        new mongoose.Schema(
          {
            status: String,
            note: String,
            by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            at: { type: Date, default: Date.now },
          },
          { _id: true }
        ),
      ],
    },

    nextFollowUpDate: Date,

    status: {
      type: String,
      enum: ['draft', 'completed', 'missed'],
      default: 'completed',
      index: true,
    },

    documents: [doctorCheckupDocumentSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

doctorCheckupSchema.index(
  { patient: 1, year: 1, month: 1, roundNumber: 1 },
  { unique: true }
);

const DoctorCheckup =
  mongoose.models.DoctorCheckup ||
  mongoose.model('DoctorCheckup', doctorCheckupSchema);

export default DoctorCheckup;