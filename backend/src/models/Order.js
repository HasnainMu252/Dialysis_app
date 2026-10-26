import mongoose from 'mongoose';

/**
 * Doctor-placed order for a medicine or a piece of equipment. Orders are visible
 * to the Front Desk and Admin, who fulfil them. A standing order recurs; a dated
 * order lands on the calendar for its orderDate.
 */
const orderSchema = new mongoose.Schema(
  {
    // Order destination/type. 'nurse' is functional (goes to the nurse to carry
    // out and complete). 'pharmacy' and 'radiology' are recorded as placeholders
    // and are not routed anywhere yet.
    orderType: {
      type: String,
      enum: ['nurse', 'pharmacy', 'radiology'],
      default: 'nurse',
      index: true,
    },

    category: {
      type: String,
      enum: ['medication', 'equipment', 'dialysis'],
      default: 'medication',
      index: true,
    },
    name: { type: String, required: true, trim: true }, // medicine / short title
    details: { type: String, trim: true, default: '' }, // dose / spec
    // Doctor instruction: what to do (e.g. "Give Panadol 500mg", "Set the drip…").
    instruction: { type: String, trim: true, default: '' },
    // How the patient should do it at home.
    homeInstruction: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },

    standing: { type: Boolean, default: false, index: true }, // recurring standing order
    orderDate: { type: Date, default: Date.now, index: true }, // date shown on the calendar

    status: {
      type: String,
      enum: ['ordered', 'in_progress', 'fulfilled', 'cancelled'],
      default: 'ordered',
      index: true,
    },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String, trim: true },

    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderedByName: { type: String, trim: true },
    orderedByRole: { type: String, trim: true },

    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fulfilledByName: { type: String, trim: true },
    fulfilledAt: { type: Date },
    // Nurse's note left when completing the order.
    nurseComment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
