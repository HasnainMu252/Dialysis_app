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
