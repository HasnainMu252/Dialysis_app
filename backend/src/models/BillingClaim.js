import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../utils/constants.js';

const claimSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DialysisSession',
      required: true,
      unique: true,
      index: true,
    },

    claimReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },

    month: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'pending',
      index: true,
    },

    insuranceProvider: String,
    submittedAt: Date,
    paidAt: Date,
    paymentAmount: Number,
    denialReason: String,
    notes: String,
  },
  { timestamps: true }
);

claimSchema.pre('validate', async function (next) {
  if (!this.claimReference) {
    const count = await mongoose.model('BillingClaim').countDocuments();
    this.claimReference = `CLM-${String(count + 1).padStart(5, '0')}`;
  }

  next();
});

export default mongoose.model('BillingClaim', claimSchema);