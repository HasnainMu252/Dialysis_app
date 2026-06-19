import mongoose from 'mongoose';
import { INSURANCE_STATUS } from '../utils/constants.js';

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    originalName: String,

    url: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: false,
    },

    fileType: String,

    size: Number,

    documentDate: {
      type: Date,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const insuranceEntrySchema = new mongoose.Schema(
  {
    providerName: String,
    payerName: String,

    insuranceCategory: {
      type: String,
      enum: ['medicare_hmo', 'medical_hmo', 'commercial_other', 'health_plan', 'medical_group', 'other'],
      default: 'other',
    },

    policyNumber: String,
    groupNumber: String,
    memberId: String,
    subscriberName: String,

    planType: String,
    healthPlanName: String,
    medicalGroupName: String,

    insuranceAddress: String,
    insurancePhone: String,
    insuranceRepName: String,
    dateContacted: Date,

    effectiveDate: Date,
    billingAddress: String,

    coPayRequired: {
      type: Boolean,
      default: false,
    },
    coPayAmount: String,

    deductibleRequired: {
      type: Boolean,
      default: false,
    },
    deductibleAmount: String,
    deductibleMet: {
      type: Boolean,
      default: false,
    },
    deductibleMetAmount: String,

    oopMaxRequired: {
      type: Boolean,
      default: false,
    },
    oopMaxAmount: String,
    oopMaxMet: {
      type: Boolean,
      default: false,
    },
    oopMaxMetAmount: String,

    lifetimeMaxRequired: {
      type: Boolean,
      default: false,
    },
    lifetimeMaxLimit: String,
    lifetimeMaxUsed: String,

    isFacilityContracted: {
      type: Boolean,
      default: false,
    },

    inNetworkBenefitAmount: String,
    inNetworkPaymentToProvider: {
      type: Boolean,
      default: false,
    },

    outOfNetworkBenefitAmount: String,
    outOfNetworkPaymentToProvider: {
      type: Boolean,
      default: false,
    },

    authorizationRequired: {
      type: Boolean,
      default: false,
    },

    referralRequired: {
      type: Boolean,
      default: false,
    },

    notes: String,
  },
  { _id: false }
);



const insuranceFormSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    patientMrn: {
      type: String,
      required: true,
      index: true,
    },

    clinicName: {
      type: String,
      trim: true,
    },

    admissionDate: Date,

    formStatus: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'expired'],
      default: 'draft',
    },

    approvalStatus: {
      type: String,
      enum: INSURANCE_STATUS,
      default: 'not_submitted',
    },

    approvalReference: String,
    approvalValidFrom: Date,
    approvalValidTo: Date,

    dueDate: {
      type: Date,
      index: true,
    },

    rejectionReason: String,

    primaryInsurance: insuranceEntrySchema,
    secondaryInsurance: insuranceEntrySchema,
    thirdInsurance: insuranceEntrySchema,

    billingDeptApprovalSignature: String,
    billingDeptApprovalDate: Date,

    documents: [documentSchema],

    comments:{
        type: String,
  trim: true,
    },

    sentExpiryNotification30Days: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const InsuranceForm =
  mongoose.models.InsuranceForm ||
  mongoose.model('InsuranceForm', insuranceFormSchema);

export default InsuranceForm;