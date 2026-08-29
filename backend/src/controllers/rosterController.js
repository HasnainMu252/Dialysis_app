import asyncHandler from 'express-async-handler';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';

/** JS getDay(): 0 Sun .. 6 Sat. mwf = Mon/Wed/Fri, tts = Tue/Thu/Sat. */
const patternForWeekday = (weekday) => {
  if ([1, 3, 5].includes(weekday)) return 'mwf';
  if ([2, 4, 6].includes(weekday)) return 'tts';
  return null; // Sunday: no recurring dialysis day
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const resolvePatient = async (idOrMrn) =>
  idOrMrn.match(/^[0-9a-fA-F]{24}$/) ? Patient.findById(idOrMrn) : Patient.findOne({ mrn: idOrMrn });

/**
 * GET /api/v1/roster/today?date=YYYY-MM-DD
 * Returns patients due for dialysis on the given day (default: today), grouped
 * by shift (1/2/3). A patient is due when either:
 *   - their dayPattern matches the weekday's pattern, OR
 * Extra (4th-session) patients are flagged so the UI can mark them.
 */
export const getTodayRoster = asyncHandler(async (req, res) => {
  const target = req.query.date ? new Date(req.query.date) : new Date();
  if (Number.isNaN(target.getTime())) throw new ApiError(400, 'Invalid date');

  const weekday = target.getDay();
  const pattern = patternForWeekday(weekday);
  const dayStart = startOfDay(target);

  const patients = pattern
    ? await Patient.find({ status: 'active', dayPattern: pattern })
        .select('firstName lastName mrn phone shift dayPattern')
        .sort('firstName')
        .lean()
    : [];

  const shifts = { 1: [], 2: [], 3: [] };

  for (const p of patients) {
    if ([1, 2, 3].includes(Number(p.shift))) {
      shifts[Number(p.shift)].push({
        _id: p._id, firstName: p.firstName, lastName: p.lastName, mrn: p.mrn,
        phone: p.phone, shift: Number(p.shift), dayPattern: p.dayPattern,
      });
    }
  }

  res.json({
    success: true,
    data: {
      date: dayStart,
      weekday,
      pattern,
      shifts,
      counts: { 1: shifts[1].length, 2: shifts[2].length, 3: shifts[3].length },
      total: shifts[1].length + shifts[2].length + shifts[3].length,
    },
    message: 'Today roster',
    errors: [],
  });
});

