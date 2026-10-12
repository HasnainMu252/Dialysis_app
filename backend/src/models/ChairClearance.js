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

    // Kind of maintenance the technician/biomed logged for this specific machine.
    maintenanceType: {
      type: String,
      enum: ['Routine clean', 'Issue report', 'Repair', 'Calibration', 'Filter change', 'Other'],
      default: 'Routine clean',
    },

    notes: {
      type: String,
      trim: true,
    },

    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Denormalised so Biomed always sees who reported, even if the user is removed.
    clearedByName: { type: String, trim: true },
    clearedByRole: { type: String, trim: true },

    clearedAt: {
      type: Date,
      default: Date.now,
    },

    // Biomed closes the report once the machine is handled.
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedByName: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('ChairClearance', chairClearanceSchema);