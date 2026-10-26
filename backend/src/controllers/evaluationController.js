import asyncHandler from 'express-async-handler';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';
import { notifyRoles } from '../services/notificationService.js';

const KINDS = ['weekly', 'monthly'];
const MONTHLY_ROUNDS = [1, 2, 3, 4]; // 4 monthly rounds per patient per month
const ROLES_DOCTOR = ['doctor', 'admin', 'don'];

const authorStamp = (req) => ({
  author: req.user?._id,
  authorName: req.user?.name,
  authorRole: req.user?.role,
});

const fullName = (p) => `${p.firstName || ''} ${p.lastName || ''}`.trim();

// Monday 00:00 → next Monday 00:00 for a given date (one weekly eval per week).
function weekRange(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(date);
  start.setDate(date.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

const hasWeeklyInWeek = (p, range) => (p.physicianEvaluations || []).some(
  (e) => e.kind === 'weekly' && e.createdAt && new Date(e.createdAt) >= range.start && new Date(e.createdAt) < range.end
);

const monthlyRoundsDone = (p, month, year) => {
  const done = new Set();
  (p.physicianEvaluations || []).forEach((e) => {
    if (e.kind === 'monthly' && Number(e.month) === Number(month) && Number(e.year) === Number(year) && e.roundNumber) {
      done.add(Number(e.roundNumber));
    }
  });
  return done;
};

/**
 * POST /api/v1/evaluations/:patientId
 * Save one physician evaluation. Enforces: 1 weekly per week, and no repeat of
 * the same monthly round in the same month for a patient.
 */
export const createEvaluation = asyncHandler(async (req, res) => {
  const { kind, shift = null, roundNumber = null, month, year, fields = {} } = req.body || {};
  if (!KINDS.includes(kind)) throw new ApiError(400, 'kind must be weekly or monthly');

  const patient = await Patient.findById(req.params.patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const m = month ? Number(month) : new Date().getMonth() + 1;
  const y = year ? Number(year) : new Date().getFullYear();

  if (kind === 'weekly') {
    if (hasWeeklyInWeek(patient, weekRange(new Date()))) {
      throw new ApiError(409, 'A weekly evaluation for this patient already exists for this week.');
    }
  } else {
    const rn = roundNumber ? Number(roundNumber) : null;
    if (!MONTHLY_ROUNDS.includes(rn)) throw new ApiError(400, 'A monthly round number (1-4) is required.');
    if (monthlyRoundsDone(patient, m, y).has(rn)) {
      throw new ApiError(409, `Round ${rn} is already completed for this patient this month.`);
    }
  }

  const entry = {
    kind,
    shift: shift ? Number(shift) : null,
    roundNumber: kind === 'monthly' && roundNumber ? Number(roundNumber) : null,
    month: m,
    year: y,
    fields,
    ...authorStamp(req),
    createdAt: new Date(),
  };
  patient.physicianEvaluations.push(entry);
  await patient.save();

  await writeAudit({ user: req.user, action: 'evaluation.create', entity: 'Patient', entityId: patient._id, details: { kind, shift } });

  const saved = patient.physicianEvaluations[patient.physicianEvaluations.length - 1];
  res.status(201).json({ data: saved, message: `${kind === 'weekly' ? 'Weekly evaluation' : `Monthly round ${entry.roundNumber}`} saved` });
});

/**
 * POST /api/v1/evaluations/batch
 * Save to many patients. Patients who already have this weekly (this week) or
 * this monthly round (this month) are SKIPPED, and reported back.
 */
export const batchEvaluation = asyncHandler(async (req, res) => {
  const { patientIds = [], kind, shift = null, roundNumber = null, month, year, fields = {} } = req.body || {};
  if (!KINDS.includes(kind)) throw new ApiError(400, 'kind must be weekly or monthly');
  if (!Array.isArray(patientIds) || !patientIds.length) throw new ApiError(400, 'patientIds required');

  const m = month ? Number(month) : new Date().getMonth() + 1;
  const y = year ? Number(year) : new Date().getFullYear();
  const rn = kind === 'monthly' && roundNumber ? Number(roundNumber) : null;
  if (kind === 'monthly' && !MONTHLY_ROUNDS.includes(rn)) throw new ApiError(400, 'A monthly round number (1-4) is required.');

  const range = weekRange(new Date());
  const patients = await Patient.find({ _id: { $in: patientIds } }).select('firstName lastName physicianEvaluations');

  const base = { kind, shift: shift ? Number(shift) : null, roundNumber: rn, month: m, year: y, fields, ...authorStamp(req) };

  const toSave = [];
  const skipped = [];
  patients.forEach((p) => {
    const dup = kind === 'weekly' ? hasWeeklyInWeek(p, range) : monthlyRoundsDone(p, m, y).has(rn);
    if (dup) skipped.push(fullName(p));
    else toSave.push(p._id);
  });

  if (toSave.length) {
    await Patient.updateMany({ _id: { $in: toSave } }, { $push: { physicianEvaluations: { ...base, createdAt: new Date() } } });
  }

  await writeAudit({ user: req.user, action: 'evaluation.batch', entity: 'Patient', details: { kind, shift, created: toSave.length, skipped: skipped.length } });

  const label = kind === 'weekly' ? 'Weekly evaluation' : `Monthly round ${rn}`;
  let message = `${label} saved for ${toSave.length} patient(s)`;
  if (skipped.length) message += ` · ${skipped.length} skipped (already done)`;
  res.status(201).json({ data: { created: toSave.length, skipped: skipped.length, skippedNames: skipped }, message });
});

/**
 * GET /api/v1/evaluations/monthly-progress?month&year&shift
 * Per active patient: which of the 4 monthly rounds are done / missing.
 */
export const monthlyProgress = asyncHandler(async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const q = { status: 'active' };
  if (req.query.shift) q.shift = Number(req.query.shift);

  const patients = await Patient.find(q).select('firstName lastName mrn shift physicianEvaluations').lean();
  const rows = patients.map((p) => {
    const done = [...monthlyRoundsDone(p, month, year)].sort((a, b) => a - b);
    const missing = MONTHLY_ROUNDS.filter((r) => !done.includes(r));
    return { _id: p._id, name: fullName(p), mrn: p.mrn, shift: p.shift, done, missing, complete: missing.length === 0 };
  });
  const incomplete = rows.filter((r) => !r.complete);
  res.json({ data: { month, year, rows, summary: { total: rows.length, complete: rows.length - incomplete.length, incomplete: incomplete.length } } });
});

/**
 * GET /api/v1/evaluations/weekly-progress?shift
 * Per active patient: whether a weekly evaluation is done this week.
 */
export const weeklyProgress = asyncHandler(async (req, res) => {
  const q = { status: 'active' };
  if (req.query.shift) q.shift = Number(req.query.shift);
  const range = weekRange(new Date());
  const patients = await Patient.find(q).select('firstName lastName mrn shift physicianEvaluations').lean();
  const rows = patients.map((p) => ({ _id: p._id, name: fullName(p), mrn: p.mrn, shift: p.shift, done: hasWeeklyInWeek(p, range) }));
  const pending = rows.filter((r) => !r.done);
  res.json({ data: { rows, summary: { total: rows.length, done: rows.length - pending.length, pending: pending.length } } });
});

/**
 * POST /api/v1/evaluations/notify-pending
 * Raise an in-app alert for patients with incomplete monthly rounds this month.
 * body: { month, year }
 */
export const notifyPending = asyncHandler(async (req, res) => {
  const kind = req.body?.kind === 'weekly' ? 'weekly' : 'monthly';
  const patients = await Patient.find({ status: 'active' }).select('firstName lastName physicianEvaluations').lean();

  if (kind === 'weekly') {
    const range = weekRange(new Date());
    const pending = patients.filter((p) => !hasWeeklyInWeek(p, range)).map((p) => fullName(p));
    if (!pending.length) return res.json({ data: { pending: 0 }, message: 'All patients have this week\'s evaluation.' });
    await notifyRoles({
      title: 'Weekly evaluations pending',
      message: `${pending.length} patient(s) still need this week's weekly evaluation. e.g. ${pending.slice(0, 6).join(', ')}${pending.length > 6 ? '…' : ''}`,
      type: 'general',
      priority: 'high',
      roles: ROLES_DOCTOR,
    });
    return res.json({ data: { pending: pending.length }, message: `Alert sent for ${pending.length} patient(s) pending this week.` });
  }

  const month = Number(req.body?.month) || new Date().getMonth() + 1;
  const year = Number(req.body?.year) || new Date().getFullYear();
  const incomplete = patients
    .map((p) => ({ name: fullName(p), missing: MONTHLY_ROUNDS.filter((r) => !monthlyRoundsDone(p, month, year).has(r)) }))
    .filter((p) => p.missing.length);

  if (!incomplete.length) return res.json({ data: { incomplete: 0 }, message: 'All patients have completed 4 rounds this month.' });

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  await notifyRoles({
    title: `Monthly rounds incomplete — ${monthName} ${year}`,
    message: `${incomplete.length} patient(s) still need monthly rounds (${incomplete.reduce((s, p) => s + p.missing.length, 0)} rounds pending). e.g. ${incomplete.slice(0, 5).map((p) => `${p.name} (${4 - p.missing.length}/4)`).join(', ')}${incomplete.length > 5 ? '…' : ''}`,
    type: 'general',
    priority: 'high',
    roles: ROLES_DOCTOR,
  });

  res.json({ data: { incomplete: incomplete.length }, message: `Alert sent for ${incomplete.length} patient(s) with incomplete rounds.` });
});

/**
 * GET /api/v1/evaluations/:patientId?kind=weekly|monthly
 */
export const listEvaluations = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.patientId).select('physicianEvaluations firstName lastName mrn shift').lean();
  if (!patient) throw new ApiError(404, 'Patient not found');
  let rows = patient.physicianEvaluations || [];
  if (req.query.kind) rows = rows.filter((r) => r.kind === req.query.kind);
  rows = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ data: rows });
});

/**
 * DELETE /api/v1/evaluations/:patientId/:evalId
 */
export const deleteEvaluation = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  patient.physicianEvaluations.id(req.params.evalId)?.deleteOne();
  await patient.save();
  res.json({ message: 'Evaluation removed' });
});
