import mongoose from 'mongoose';

const chairClearanceSchema = new mongoose.Schema(
  {
    chair: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chair',
      required: true,
      index: true,
    },

    chairCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['available', 'maintenance', 'cleaning', 'out_of_order'],
      default: 'available',
      index: true,
    },

    checklist: {
      chairChecked: { type: Boolean, default: false },
      machineChecked: { type: Boolean, default: false },
      filterChecked: { type: Boolean, default: false },
      solutionChecked: { type: Boolean, default: false },
      cleaned: { type: Boolean, default: false },
      safeForUse: { type: Boolean, default: false },
    },

    notes: {
      type: String,
      trim: true,
    },

    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    clearedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ChairClearance', chairClearanceSchema);