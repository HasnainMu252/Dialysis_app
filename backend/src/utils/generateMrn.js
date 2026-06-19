import Counter from '../models/Counter.js';

export const generateMrn = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'patient_mrn' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `MRN-${String(counter.seq).padStart(6, '0')}`;
};