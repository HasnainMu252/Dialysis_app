import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: [
        'insurance_expiry',
        'insurance_approval',
        'schedule_created',
        'schedule_updated',
        'general',
        'test',
      ],
      default: 'general',
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },

    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      index: true,
    },

    insuranceForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceForm',
    },

    roles: [{ type: String, index: true }],

    createdForUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    dueDate: Date,

    expiresAt: Date,

    isReadBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

notificationSchema.index({ roles: 1, createdAt: -1 });
notificationSchema.index({ type: 1, dueDate: 1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);

export default Notification;