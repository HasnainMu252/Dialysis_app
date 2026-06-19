import mongoose from 'mongoose';
import { CHAIR_STATUS } from '../utils/constants.js';

const chairSchema = new mongoose.Schema(
  {
    chairNumber: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    location: {
  type: String,
  trim: true,
},

room: {
  type: String,
  trim: true,
},

ward: {
  type: String,
  trim: true,
},

status: {
  type: String,
  enum: CHAIR_STATUS,
  default: 'available',
  index: true,
},

    name: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      default: 'Dialysis Chair',
      trim: true,
    },


   

    maintenanceUntil: {
      type: Date,
      default: null,
    },

    currentSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DialysisSession',
      default: null,
    },

    lastCleanedAt: {
      type: Date,
      default: null,
    },

    lastMaintenanceAt: {
      type: Date,
      default: null,
    },

    conditionNotes: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

chairSchema.pre('validate', async function (next) {
  try {
    if (!this.chairNumber) {
      const lastChair = await mongoose
        .model('Chair')
        .findOne({ chairNumber: { $regex: /^CH-\d+$/ } })
        .sort({ createdAt: -1 })
        .select('chairNumber');

      let nextNumber = 1;

      if (lastChair?.chairNumber) {
        const lastNumber = Number(lastChair.chairNumber.replace('CH-', ''));

        if (!Number.isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      this.chairNumber = `CH-${String(nextNumber).padStart(2, '0')}`;
    }

    this.chairNumber = this.chairNumber.trim().toUpperCase();

    if (!this.code) {
      this.code = this.chairNumber;
    }

    this.code = this.code.trim().toUpperCase();

    if (!this.name) {
      this.name = this.chairNumber;
    }

    next();
  } catch (error) {
    next(error);
  }
});

chairSchema.index({ status: 1, isActive: 1 });

const Chair = mongoose.models.Chair || mongoose.model('Chair', chairSchema);

export default Chair;