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

// A single vascular-access line (fistula or catheter). Age is derived from
// placementDate when present; ageText is a manual fallback. Editable by nurse
// and doctor (and admin) via the dedicated vascular-access endpoint.
const accessLineSchema = new mongoose.Schema(
  {
    present: { type: Boolean, default: false },
    type: { type: String, trim: true, default: '' },   // AV Fistula | AV Graft | Catheter ...
    site: { type: String, trim: true, default: '' },    // e.g. Left Upper Arm
    placementDate: Date,
    ageText: { type: String, trim: true, default: '' }, // used when no placementDate
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const vascularAccessSchema = new mongoose.Schema(
  {
    fistula: { type: accessLineSchema, default: () => ({}) },
    catheter: { type: accessLineSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedAt: Date,
  },
  { _id: false }
);

// ---- Social worker (Phase C) ----
const complaintSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const socialWorkSchema = new mongoose.Schema(
  {
    evaluation: { type: String, trim: true, default: '' },
    transportation: { type: String, trim: true, default: '' },
    familyDynamics: { type: String, trim: true, default: '' },
    transplant: { type: String, trim: true, default: '' },
    complaints: [complaintSchema], // entered by social worker; visible to doctor
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedAt: Date,
  },
  { _id: false }
);

// ---- Medical background bio tab (Phase C) ----
const hospitalizationSchema = new mongoose.Schema(
  {
    date: Date,
    reason: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const medicalBackgroundSchema = new mongoose.Schema(
  {
    // Internal
    historyPhysical: { type: String, trim: true, default: '' },     // H&P, updated every 6 months
    historyPhysicalUpdatedAt: Date,
    vaccinations: {
      hepatitis: { type: String, trim: true, default: '' },
      tb: { type: String, trim: true, default: '' },
      isolations: { type: String, trim: true, default: '' },
      other: { type: String, trim: true, default: '' },
    },
    // External
    hospitalizations: [hospitalizationSchema],
    cardiacWorkup: { type: String, trim: true, default: '' },
    cancerWorkup: { type: String, trim: true, default: '' },
    other: { type: String, trim: true, default: '' },
    // Kidney transplant information + correspondence from the transplant center
    transplant: { type: String, trim: true, default: '' },
    transplantCorrespondence: { type: String, trim: true, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedAt: Date,
  },
  { _id: false }
);

// ---- Dietitian / nutrition (Phase C) ----
const educationMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    givenAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const nutritionSchema = new mongoose.Schema(
  {
    foodHurdles: { type: String, trim: true, default: '' },
    educationMaterials: [educationMaterialSchema],
    notes: { type: String, trim: true, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedAt: Date,
  },
  { _id: false }
);

// Weekly Dialysis Evaluation — a config-driven checkbox template, logged over
// time. `data` holds the checked items for that week.
const weeklyEvaluationSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true },
    authorRole: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Structured vaccination log — one entry per dose. Replaces the free-text
// vaccination strings that used to live inside medicalBackground.
const vaccinationSchema = new mongoose.Schema(
  {
    vaccineName: { type: String, trim: true, required: true },
    vaccineType: { type: String, trim: true, default: '' }, // e.g. Hepatitis B, Influenza, COVID-19
    route: { type: String, trim: true, default: 'Injection' }, // Injection | Oral
    givenAt: { type: Date, default: Date.now }, // date & time administered
    comments: { type: String, trim: true, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true },
    authorRole: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
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

    /**
     * The patient's assigned treatment shift (1 | 2 | 3).
     * 1 = 05:00-08:00, 2 = 09:00-12:00, 3 = 12:30-16:00.
     * Their schedules default to this shift so staff can recognise it easily.
     */
    shift: {
      type: Number,
      enum: [1, 2, 3, null],
      default: null,
      index: true,
    },

    /**
     * Recurring dialysis-day pattern:
     *   'mwf' = Monday / Wednesday / Friday
     *   'tts' = Tuesday / Thursday / Saturday
     * Combined with shift, this places the patient on a repeating weekly schedule.
     */
    dayPattern: {
      type: String,
      enum: ['mwf', 'tts', null],
      default: null,
      index: true,
    },

    /**
     * Recurring dialysis booking. When active and the patient has a dayPattern +
     * shift, the system generates Schedule records for the coming matching dates
     * (Mon/Wed/Fri or Tue/Thu/Sat at the assigned shift), rolling forward until
     * stopped. `chair` is the station to book; if unset the generator picks the
     * patient's usual/first available station.
     */
    recurring: {
      active: { type: Boolean, default: false, index: true },
      chair: { type: mongoose.Schema.Types.ObjectId, ref: 'Chair' },
      startedAt: Date,
      startedByName: String,
      stoppedAt: Date,
      stoppedByName: String,
      lastGeneratedDate: Date, // furthest date we've generated up to
    },

    homeFacility: {
      facilityName: String,
      facilityPhone: String,
      facilityFax: String,
    },

    emergencyContact: contactSchema,
    medicalHistory: medicalSchema,

    // Fistula / catheter access with placement dates (age derived in the UI).
    // Shown on the patient record and in the booked-session / treatment detail.
    vascularAccess: { type: vascularAccessSchema, default: () => ({}) },

    // Phase C additions.
    socialWork: { type: socialWorkSchema, default: () => ({}) },
    medicalBackground: { type: medicalBackgroundSchema, default: () => ({}) },
    nutrition: { type: nutritionSchema, default: () => ({}) },
    weeklyEvaluations: [weeklyEvaluationSchema],
    vaccinations: [vaccinationSchema],

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