import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Denormalised so the record stays meaningful even if the user is later deleted
    userEmail: { type: String, index: true },
    userRole: { type: String },

    action: { type: String, required: true, index: true },
    entity: { type: String, index: true },
    entityId: mongoose.Schema.Types.ObjectId,

    method: String,
    path: String,
    statusCode: Number,
    ipAddress: String,
    userAgent: String,

    status: { type: String, enum: ['success', 'failed'], default: 'success', index: true },
    details: Object,
  },
  { timestamps: true }
);

// Common query patterns: newest first, by user, by entity, by date.
auditSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditSchema);
