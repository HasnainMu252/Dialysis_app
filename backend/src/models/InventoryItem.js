import mongoose from 'mongoose';

// Stock movement: purchase (+), usage (-), adjustment (signed).
const txnSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['purchase', 'usage', 'adjustment'], default: 'purchase' },
    quantity: { type: Number, default: 0 },
    note: { type: String, trim: true, default: '' },
    date: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, enum: ['drug', 'non_drug'], default: 'drug', index: true },
    unit: { type: String, trim: true, default: '' },
    quantityOnHand: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    supplier: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    transactions: [txnSchema],
  },
  { timestamps: true }
);

export default mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
