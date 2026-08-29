import Patient from '../models/Patient.js';
import Chair from '../models/Chair.js';
import Schedule from '../models/Schedule.js';
import DialysisSession from '../models/DialysisSession.js';
import { SHIFTS } from '../utils/constants.js';
import { buildUtcDateTime, createSession } from './schedulingService.js';

/** How many days ahead to keep the recurring schedule filled. */
const HORIZON_DAYS = 30;

/** Weekday numbers (0 Sun..6 Sat) for each pattern. */
const PATTERN_DAYS = {
  mwf: [1, 3, 5],
  tts: [2, 4, 6],
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/**
 * Pick the station to use for a patient's recurring booking:
 * their configured recurring.chair, else any active chair.
 */
const resolveChair = async (patient) => {
  // 1. The patient's configured recurring station always wins.
  if (patient.recurring?.chair) {
    const c = await Chair.findById(patient.recurring.chair).lean();
    if (c) return c;
  }

  // 2. No assigned station: spread patients across usable chairs so they don't
  //    all pile onto one. Pick a STABLE chair per patient (by their id) so the
  //    same patient always lands on the same station.
  const usable = await Chair.find({ status: { $ne: 'out_of_order' } }).sort('chairNumber').lean();
  if (usable.length) {
    const idStr = String(patient._id || '');
    let hash = 0;
    for (let i = 0; i < idStr.length; i += 1) hash = (hash * 31 + idStr.charCodeAt(i)) % 100000;
    return usable[hash % usable.length];
  }

  // 3. Absolute fallback: any chair at all.
  return Chair.findOne().sort('chairNumber').lean();
};

/**
 * Generate missing recurring Schedule records for one patient up to the horizon.
 * Idempotent: skips dates that already have a schedule for this patient+shift.
 * Returns the number of schedules created.
 */
export const generateRecurringForPatient = async (patientOrId, { bookedBy } = {}) => {
  const patient = typeof patientOrId === 'object' && patientOrId.dayPattern !== undefined
    ? patientOrId
    : await Patient.findById(patientOrId);

  if (!patient) return 0;
  // Recurring runs automatically whenever the patient has a day pattern + shift.
  // It only pauses if someone explicitly stopped it (recurring.active === false
  // AND a stoppedAt stamp exists).
  const explicitlyStopped = patient.recurring?.active === false && patient.recurring?.stoppedAt;
  if (explicitlyStopped) return 0;
  if (!patient.dayPattern || !PATTERN_DAYS[patient.dayPattern]) return 0;
  if (![1, 2, 3].includes(Number(patient.shift))) return 0;

  const shiftDef = SHIFTS.find((s) => s.id === Number(patient.shift));
  if (!shiftDef) return 0;

  const chair = await resolveChair(patient);
  if (!chair) return 0; // no station configured yet

  const days = PATTERN_DAYS[patient.dayPattern];
  const today = startOfDay(new Date());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);

  // Preload existing schedules for this patient in the window to avoid dupes.
  const existing = await Schedule.find({
    patient: patient._id,
    date: { $gte: today, $lte: horizon },
  }).select('date shift').lean();
  const existingKeys = new Set(existing.map((e) => `${ymd(e.date)}-${e.shift}`));

  // Backfill: any recurring schedule in the window that has no session yet gets
  // one, so schedules booked before the session-creation fix still appear in
  // the treatment flow.
  const windowSchedules = await Schedule.find({
    patient: patient._id,
    recurring: true,
    date: { $gte: today, $lte: horizon },
  }).select('_id patient chair nurse').lean();
  if (windowSchedules.length) {
    const schedIds = windowSchedules.map((s) => s._id);
    const withSession = await DialysisSession.find({ schedule: { $in: schedIds } })
      .select('schedule').lean();
    const haveSession = new Set(withSession.map((s) => String(s.schedule)));
    for (const sc of windowSchedules) {
      if (!haveSession.has(String(sc._id))) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await createSession(sc);
        } catch { /* non-fatal */ }
      }
    }
  }

  let created = 0;
  let furthest = patient.recurring?.lastGeneratedDate ? new Date(patient.recurring.lastGeneratedDate) : null;

  for (let d = new Date(today); d <= horizon; d.setDate(d.getDate() + 1)) {
    if (!days.includes(d.getDay())) continue;

    const key = `${ymd(d)}-${patient.shift}`;
    if (existingKeys.has(key)) continue;

    const dateStr = ymd(d);
    const startAt = buildUtcDateTime(dateStr, shiftDef.start);
    const endAt = buildUtcDateTime(dateStr, shiftDef.end);

    try {
      // eslint-disable-next-line no-await-in-loop
      const schedule = await Schedule.create({
        patient: patient._id,
        patientMrn: patient.mrn,
        chair: chair._id,
        chairCode: chair.code || chair.chairNumber || 'STATION',
        date: new Date(`${dateStr}T00:00:00.000Z`),
        startTime: shiftDef.start,
        endTime: shiftDef.end,
        startAt,
        endAt,
        shift: Number(patient.shift),
        durationHours: 0,
        bookedBy: bookedBy || undefined,
        recurring: true,
      });
      // Create the matching treatment session so the patient appears in the
      // treatment flow (nurse/technician start dialysis from there), same as a
      // normal booking.
      // eslint-disable-next-line no-await-in-loop
      await createSession(schedule);
      created += 1;
      existingKeys.add(key);
      if (!furthest || d > furthest) furthest = new Date(d);
    } catch (err) {
      // A clash (station taken at that slot) or validation error for one date
      // shouldn't stop the rest of the series.
      if (err?.code !== 11000) {
        // keep going; log lightly
        // eslint-disable-next-line no-console
        console.warn(`recurring gen skip ${dateStr} shift ${patient.shift}: ${err.message}`);
      }
    }
  }

  if (created > 0 || !patient.recurring.lastGeneratedDate) {
    patient.recurring.lastGeneratedDate = furthest || horizon;
    await patient.save();
  }

  return created;
};

/**
 * Sweep all patients with active recurring booking and top up their schedules.
 * Safe to call on a schedule (e.g. daily cron) or on demand.
 */
export const generateRecurringForAll = async () => {
  // Everyone with a pattern + shift who hasn't been explicitly stopped.
  const patients = await Patient.find({
    status: 'active',
    dayPattern: { $in: ['mwf', 'tts'] },
    shift: { $in: [1, 2, 3] },
    'recurring.stoppedAt': { $in: [null, undefined] },
  });
  let total = 0;
  for (const p of patients) {
    // eslint-disable-next-line no-await-in-loop
    total += await generateRecurringForPatient(p);
  }
  return total;
};
