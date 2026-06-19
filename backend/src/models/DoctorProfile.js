import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    specialty: {
      type: String,
      trim: true,
      default: 'Nephrology',
    },

    licenseNumber: {
      type: String,
      trim: true,
    },

    assignedPatients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
      },
    ],

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

doctorProfileSchema.index({ fullName: 'text', licenseNumber: 'text' });

const DoctorProfile =
  mongoose.models.DoctorProfile ||
  mongoose.model('DoctorProfile', doctorProfileSchema);

export default DoctorProfile;