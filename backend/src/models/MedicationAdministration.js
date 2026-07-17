import mongoose from 'mongoose';

const ROUTES = ['IV', 'Oral', 'Arterial', 'Venous', 'Subcutaneous', 'Inhaled', 'Other'];

const medicationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientMrn: { type: String, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'DialysisSession', index: true },

    name: { type: String, required: true, trim: true, index: true },
    dose: { type: Number, default: 0 },
    unit: { type: String, trim: true, default: 'mg' }, // mg, mcg, ml, IU, Units, min
    route: { type: String, enum: ROUTES, default: 'IV' },
    quantity: { type: Number, default: 1 },
    administrationTime: { type: Date },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    givenByName: { type: String, trim: true },
    notes: { type: String, trim: true },

    // Denormalised for fast monthly aggregation / billing
    facility: { type: String, trim: true },
    date: { type: Date, default: Date.now, index: true },
    month: { type: Number, index: true },
    year: { type: Number, index: true },
    billingStatus: { type: String, enum: ['pending', 'billed', 'paid'], default: 'pending' },

    // ---- Lifecycle / never-lose-the-record trail ----
    // active  -> currently in effect
    // cancelled -> stopped by a doctor/nurse (still counts in history/reports)
    // deleted -> soft-removed (data-entry correction); kept but excluded from active views
    status: { type: String, enum: ['active', 'cancelled', 'deleted'], default: 'active', index: true },

    addedAt: { type: Date, default: Date.now },
    addedByName: { type: String, trim: true },
    addedByRole: { type: String, trim: true },

    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledByName: { type: String, trim: true },
    cancelledByRole: { type: String, trim: true },
    cancelReason: { type: String, trim: true },

    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedByName: { type: String, trim: true },
    deletedByRole: { type: String, trim: true },
  },
  { timestamps: true }
);

medicationSchema.pre('save', function (next) {
  const d = this.administrationTime || this.date || new Date();
  this.date = d;
  this.month = d.getMonth() + 1;
  this.year = d.getFullYear();
  next();
});

export const MEDICATION_ROUTES = ROUTES;
export default mongoose.model('MedicationAdministration', medicationSchema);

// Compound indexes for report/usage aggregation under concurrent load.
medicationSchema.index({ year: 1, month: 1 });
medicationSchema.index({ patient: 1, date: 1 });
