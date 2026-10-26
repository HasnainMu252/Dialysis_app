import mongoose from 'mongoose';
import { SESSION_STATUS } from '../utils/constants.js';

const vitalsSchema = new mongoose.Schema(
  {
    // before = Pre Dialysis, during = Intra-dialytic, after = Post Dialysis
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
    // Sitting / standing blood pressure and heart rate (orthostatic readings).
    sittingBp: String,
    standingBp: String,
    sittingHeartRate: Number,
    standingHeartRate: Number,
    // Weights + fluid removed (deltaWeight = preWeight - postWeight).
    preWeight: Number,
    postWeight: Number,
    deltaWeight: Number,
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

// ---- Flow sheet (technician-entered during treatment) ----
// Mirrors the paper flow sheet: machine checks, solution mixing, access list,
// access assessment. The dialysis prescription itself is the doctor-authored
// DialysisPrescription (shown read-only); cannulation + "treatment initiated by"
// are already captured by the cannulation checklist and startedBy.
const machineCheckSchema = new mongoose.Schema(
  {
    machineBrand: { type: String, trim: true, default: '' },
    machineNo: { type: String, trim: true, default: '' },
    conductivityMachine: { type: String, trim: true, default: '' },
    conductivityMeter: { type: String, trim: true, default: '' },
    dicapFilterHoursRemaining: { type: String, trim: true, default: '' },
    temperature: { type: String, trim: true, default: '' },
    ph: { type: String, trim: true, default: '' },
    alarmTest: { type: String, trim: true, default: '' },           // Pass | Fail
    airDetector: { type: String, trim: true, default: '' },
    pressureTestMachine: { type: String, trim: true, default: '' },
    pressureCheckDialyzer: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const solutionMixingSchema = new mongoose.Schema(
  {
    dialysisWater: { type: String, trim: true, default: '' },
    bicarbonate: { type: String, trim: true, default: '' },
    mixing: { type: String, trim: true, default: '' },
    temperature: { type: String, trim: true, default: '' },
    correctSolutionVerified: { type: Boolean, default: false },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const flowAccessLineSchema = new mongoose.Schema(
  {
    inUse: { type: Boolean, default: false },
    type: { type: String, trim: true, default: '' },
    site: { type: String, trim: true, default: '' },
    placementDate: Date,
    surgeon: { type: String, trim: true, default: '' },
    arterialSide: { type: String, trim: true, default: '' },
    infiltrations: { type: String, trim: true, default: '' },
    bloodFlowRate: { type: String, trim: true, default: '' },
    accessWashed: { type: String, trim: true, default: '' },
    patientHandsWashed: { type: String, trim: true, default: '' },
    catheterVerification: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const accessAssessmentSchema = new mongoose.Schema(
  {
    evaluationTime: { type: String, trim: true, default: '' },
    bruit: { type: String, trim: true, default: '' },
    thrill: { type: String, trim: true, default: '' },
    extremitySwelling: { type: String, trim: true, default: '' },
    dressingChanged: { type: String, trim: true, default: '' },
    softTissueInfection: { type: String, trim: true, default: '' },
    accessInfectionBacteremia: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Structured access evaluation — a Yes/No checklist whose items depend on the
// access type (Permacath / AV fistula / AV graft).
const accessEvaluationSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: '' }, // permacath | av_fistula | av_graft
    checks: {
      // Permacath
      permacath_noInfection: { type: Boolean, default: false },
      permacath_noDischarge: { type: Boolean, default: false },
      permacath_dressingClean: { type: Boolean, default: false },
      // AV fistula
      fistula_noInfection: { type: Boolean, default: false },
      fistula_noPseudoaneurysm: { type: Boolean, default: false },
      fistula_noUlceration: { type: Boolean, default: false },
      fistula_warmCirculation: { type: Boolean, default: false },
      fistula_noDeficit: { type: Boolean, default: false },
      // AV graft
      graft_noSteal: { type: Boolean, default: false },
      graft_goodBruit: { type: Boolean, default: false },
      graft_mature: { type: Boolean, default: false },
    },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const flowSheetSchema = new mongoose.Schema(
  {
    machineCheck: { type: machineCheckSchema, default: () => ({}) },
    solutionMixing: { type: solutionMixingSchema, default: () => ({}) },
    accessList: [flowAccessLineSchema],
    accessAssessment: { type: accessAssessmentSchema, default: () => ({}) },
    accessEvaluation: { type: accessEvaluationSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedByRole: { type: String, trim: true },
    updatedAt: Date,
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

    // Technician-entered clinical flow sheet (machine checks, solution mixing,
    // access list, access assessment). One per session.
    flowSheet: { type: flowSheetSchema, default: () => ({}) },

    treatmentSummary: String,
    sentToBillerAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('DialysisSession', sessionSchema);