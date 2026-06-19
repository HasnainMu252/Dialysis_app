import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Counter from '../models/Counter.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

await Counter.findOneAndUpdate(
  { name: 'patient_mrn' },
  { $set: { seq: 13 } },
  { upsert: true, new: true }
);

process.exit();
