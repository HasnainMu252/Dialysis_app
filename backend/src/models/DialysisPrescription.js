import mongoose from 'mongoose';

/**
 * Hemodialysis order / dialysis prescription for a patient.
 *
 * Authored by a DOCTOR. One prescription is "active" per patient at a time;
 * updating creates a new active record and marks the previous one "superseded",
 * so the full history is kept. Nurses / technicians view it read-only and run
 * the treatment according to it.
 */
const dialysisPrescriptionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientMrn: { type: String, index: true },

    // active -> current order; superseded -> replaced by a newer one
    status: { type: String, enum: ['active', 'superseded'], default: 'active', index: true },

    // ---- Order fields (from the hemodialysis order form) ----
    frequency: { type: String, trim: true, default: '' },        // Once | Every Mon-Wed-Fri | Every Tue-Thu-Sat
    duration: { type: String, trim: true, default: '' },         // 2 Hours ... More than 4 Hours
    bathOrderType: { type: String, trim: true, default: 'Bath' },// Bath | Non-Bath
    bath: { type: String, trim: true, default: '' },             // 2K/2.5Ca etc. (required in form)
    bathOther: { type: String, trim: true, default: '' },
    bicarb: { type: String, trim: true, default: '' },
    bicarbOther: { type: String, trim: true, default: '' },
    sodium: { type: String, trim: true, default: '' },
    sodiumOther: { type: String, trim: true, default: '' },
    sodiumVariation: { type: String, trim: true, default: 'None' },
    sodiumModeling: { type: String, trim: true, default: '' },
    dialyzer: { type: String, trim: true, default: '' },
    dialyzerOther: { type: String, trim: true, default: '' },
    temperature: { type: String, trim: true, default: '' },      // Celsius
    bloodFlowRate: { type: String, trim: true, default: '' },
    bloodFlowRateOther: { type: String, trim: true, default: '' },
    dialysateFlowRate: { type: String, trim: true, default: '' },
    dialysateFlowRateOther: { type: String, trim: true, default: '' },
    fluidRemoval: { type: String, trim: true, default: '' },
    fluidRemovalOther: { type: String, trim: true, default: '' },
    tubing: { type: String, trim: true, default: '' },
    tubingOther: { type: String, trim: true, default: '' },
    needleSize: { type: String, trim: true, default: '' },
    accessSite: { type: String, trim: true, default: '' },
    accessSiteOther: { type: String, trim: true, default: '' },
    minimumSystolic: { type: Number },
    abnormalPotassium: { type: String, trim: true, default: 'No' },
    abnormalSodium: { type: String, trim: true, default: 'No' },
    comments: { type: String, trim: true, default: '' },

    // ---- Authoring trail ----
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prescribedByName: { type: String, trim: true },
    prescribedAt: { type: Date, default: Date.now },
    supersededAt: { type: Date },
  },
  { timestamps: true }
);

dialysisPrescriptionSchema.index({ patient: 1, status: 1, createdAt: -1 });

export default mongoose.model('DialysisPrescription', dialysisPrescriptionSchema);
