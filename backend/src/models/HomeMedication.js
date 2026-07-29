import mongoose from 'mongoose';

// Reuse the same route vocabulary as dialysis medications, plus the common
// oral/topical route abbreviations used on standing home-medication lists.
const ROUTES = [
  'IV', 'Oral', 'PO', 'Arterial', 'Venous', 'Subcutaneous', 'SL',
  'Inhaled', 'Topical', 'Transdermal', 'Ophthalmic', 'Rectal', 'IM', 'Other',
];

// Common home-medication frequencies (free text still allowed via `Other`).
const FREQUENCIES = [
  'Once daily',
  'Twice daily (BID)',
  'Three times daily (TID)',
  'Four times daily (QID)',
  'Every other day',
  'Weekly',
  'With dialysis',
  'As needed (PRN)',
  'Other',
];

/**
 * A medication the patient takes AT HOME — i.e. outside the dialysis session.
 * This is a standing medication list (like a prescription list), NOT a per-session
 * administration record. Dialysis medications keep living in MedicationAdministration.
 */
const homeMedicationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientMrn: { type: String, index: true },

    name: { type: String, required: true, trim: true, index: true },
    dose: { type: Number, default: 0 },
    unit: { type: String, trim: true, default: 'mg' }, // mg, mcg, ml, IU, Units, tablet...
    route: { type: String, trim: true, default: 'Oral' }, // controlled in the UI; free-form here to avoid stale-enum save failures
    frequency: { type: String, trim: true, default: 'Once daily' },
    quantity: { type: Number, default: 1 }, // e.g. tablets per dose

    prescribedBy: { type: String, trim: true }, // prescribing physician (free text)
    startDate: { type: Date },
    endDate: { type: Date },
    // active -> in effect; discontinued/cancelled -> stopped (kept); deleted -> soft-removed
    status: { type: String, enum: ['active', 'discontinued', 'cancelled', 'deleted'], default: 'active', index: true },
    notes: { type: String, trim: true },

    // ---- Lifecycle / never-lose-the-record trail ----
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedByName: { type: String, trim: true },
    addedByRole: { type: String, trim: true }, // 'nurse' | 'doctor' | 'admin'

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

export const HOME_MED_ROUTES = ROUTES;
export const HOME_MED_FREQUENCIES = FREQUENCIES;
export default mongoose.model('HomeMedication', homeMedicationSchema);
