import mongoose from 'mongoose';

// A maintenance / service record entered manually by Biomed.
const maintenanceSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    type: { type: String, trim: true, default: '' }, // Preventive | Repair | Calibration | Disinfection | Other
    note: { type: String, trim: true, default: '' },
    performedByName: { type: String, trim: true, default: '' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const machineSchema = new mongoose.Schema(
  {
    machineCode: { type: String, required: true, unique: true, trim: true },
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    serialNumber: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    chair: { type: mongoose.Schema.Types.ObjectId, ref: 'Chair' },
    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance', 'out_of_order'],
      default: 'available',
    },
    installedAt: Date,
    lastMaintenanceAt: Date,
    nextMaintenanceDue: Date,
    notes: { type: String, trim: true, default: '' },
    maintenance: [maintenanceSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Machine || mongoose.model('Machine', machineSchema);
