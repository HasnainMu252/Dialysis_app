import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: String,
      unique: true,
      index: true,
    },

    code: {
      type: String,
      unique: true,
      index: true,
    },

    patientMrn: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    chairCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    chair: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chair',
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationHours: {
      type: Number,
      default: 0,
    },

    bufferMinutes: {
      type: Number,
      default: 30,
       min: 0,
    },

    state: {
      type: String,
      enum: [
        'Pending',
        'Scheduled',
        'CheckedIn',
        'InProgress',
        'Completed',
        'Cancelled',
        'NoShow',
      ],
      default: 'Scheduled',
      index: true,
    },

    status: {
      type: String,
      enum: [
        'Pending',
        'Scheduled',
        'CheckedIn',
        'InProgress',
        'Completed',
        'Cancelled',
        'NoShow',
      ],
      default: 'Scheduled',
      index: true,
    },

    cancel: {
      requested: {
        type: Boolean,
        default: false,
      },
      approved: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        trim: true,
      },
    },

    approval: {
      approvedAt: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectedAt: Date,
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: {
        type: String,
        trim: true,
      },
    },

    notes: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

scheduleSchema.pre('validate', async function (next) {
  try {
    if (this.scheduleId && this.code) return next();

    const Schedule = mongoose.model('Schedule');

    const lastSchedule = await Schedule.findOne({
      scheduleId: { $regex: /^SCH-\d+$/ },
    })
      .sort({ scheduleId: -1 })
      .select('scheduleId');

    let nextNumber = 1;

    if (lastSchedule?.scheduleId) {
      const lastNumber = Number(lastSchedule.scheduleId.replace('SCH-', ''));

      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const newScheduleId = `SCH-${String(nextNumber).padStart(3, '0')}`;

    this.scheduleId = this.scheduleId || newScheduleId;
    this.code = this.code || this.scheduleId;

    next();
  } catch (error) {
    next(error);
  }
});

scheduleSchema.index({
  chair: 1,
  startAt: 1,
  endAt: 1,
});

scheduleSchema.index({
  patientMrn: 1,
  date: 1,
});

const Schedule =
  mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

export default Schedule;