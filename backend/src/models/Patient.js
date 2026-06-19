import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relation: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const medicalSchema = new mongoose.Schema(
  {
    diagnosis: { type: String, trim: true },
    dialysisFrequency: { type: String, trim: true },
    allergies: [{ type: String, trim: true }],
    accessType: { type: String, trim: true },
    notes: { type: String, trim: true },
    postWeight: String,
    height: String,
    diabetic: { type: String, enum: ['yes', 'no', 'unknown'], default: 'unknown' },
    renalFailureDueToAccident: String,
    hadDialysisBefore: String,
    previousDialysisLocation: String,
    previousDialysisDate: Date,
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    facility: { type: String, trim: true },
    admissionDate: Date,
    firstDialysis: Date,
    attendingPhysician: { type: String, trim: true },
    medicalRecordNumber: { type: String, trim: true },
    ssn: { type: String, select: false },
    maritalStatus: String,
    spouseSsn: { type: String, select: false },
    religion: String,
    secondaryPayerAddress: String,
    patientSignature: String,
    patientSignatureDate: Date,
    policyHolderSignature: String,
    policyHolderSignatureDate: Date,
  },
  { _id: false }
);

const insuranceSchema = new mongoose.Schema(
  {
    providerName: String,
    payerName: String,
    policyNumber: String,
    groupNumber: String,
    memberId: String,
    planType: String,

    coverageStatus: {
      type: String,
      enum: ['not_submitted', 'submitted', 'approved', 'rejected', 'expired'],
      default: 'not_submitted',
      index: true,
    },

    effectiveDate: Date,

    expiryDate: {
      type: Date,
      index: true,
    },

    authorizationRequired: {
      type: Boolean,
      default: false,
    },

    authorizationNumber: String,
    notes: String,
  },
  { _id: false }
);

// models/Patient.js — replace documentSchema
const documentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    title: { type: String, trim: true }, // kept for backward compatibility
    category: {
      type: String,
      enum: ['registration', 'insurance', 'authorization', 'lab', 'clinical', 'other'],
      default: 'other',
    },
    fileName: String,
    originalName: String,
    mimeType: String,
    fileType: String, // tree/viewer checks this for pdf/image detection
    size: Number,
    path: String,
    url: String,
    documentDate: Date,
    notes: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true } // was false — needed for edit/delete by id and React keys
);
const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    mrn: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true,
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      index: true,
    },

    dob: Date,

    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'Male', 'Female', 'Other', ''],
    },

    phone: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: String,
    state: String,
    zip: String,

    referralSource: { type: String, trim: true },
    hospital: { type: String, trim: true },

    patientType: {
      newPatient: Boolean,
      transferPatient: Boolean,
      transientPatient: Boolean,
      currentPatient: Boolean,
    },

    homeFacility: {
      facilityName: String,
      facilityPhone: String,
      facilityFax: String,
    },

    emergencyContact: contactSchema,
    medicalHistory: medicalSchema,
    registration: registrationSchema,

    insurance: insuranceSchema,

    documents: [documentSchema],

    assignedSocialWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'transferred', 'deceased'],
      default: 'active',
      index: true,
    },

    sentToBillerAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.registration?.ssn;
        delete ret.registration?.spouseSsn;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

patientSchema.index({
  firstName: 'text',
  lastName: 'text',
  mrn: 'text',
  phone: 'text',
});

patientSchema.index({
  'insurance.expiryDate': 1,
  'insurance.coverageStatus': 1,
});

patientSchema.index({ status: 1, createdAt: -1 });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

export default Patient;