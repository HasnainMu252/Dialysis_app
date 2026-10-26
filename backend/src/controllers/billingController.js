import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import BillingClaim from '../models/BillingClaim.js';
import DialysisSession from '../models/DialysisSession.js';
import DoctorCheckup from '../models/DoctorCheckup.js';
import MedicationAdministration from '../models/MedicationAdministration.js';
import HomeMedication from '../models/HomeMedication.js';
import { generateDueClaims } from '../services/billingAutoService.js';
import { ApiError } from '../utils/apiError.js';

/** Resolve a {month, year} query into a [start, end) date range (defaults: current month). */
const monthRange = (query = {}) => {
  const now = new Date();
  const year = Number(query.year) || now.getFullYear();
  const month = Number(query.month) || now.getMonth() + 1; // 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { year, month, start, end };
};

const findPatientByIdOrMrn = async (patientIdOrMrn) => {
  const query = mongoose.Types.ObjectId.isValid(patientIdOrMrn)
    ? { _id: patientIdOrMrn }
    : { mrn: patientIdOrMrn };

  return Patient.findOne(query);
};
const findClaimQuery = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }

  return { claimReference: id };
};

export const updateInsurance = asyncHandler(async (req, res) => {
  const patient = await findPatientByIdOrMrn(req.params.patientIdOrMrn);

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }

  patient.insurance = req.body;
  await patient.save();

  res.json({
    success: true,
    data: patient,
  });
});

export const createClaim = asyncHandler(async (req, res) => {
  const {
    patient: patientIdOrMrn,
    session,
    claimReference,
    ...claimData
  } = req.body;

  if (!patientIdOrMrn) {
    return res.status(400).json({
      success: false,
      message: 'Patient is required',
    });
  }

  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'Session is required',
    });
  }

  const patient = await findPatientByIdOrMrn(patientIdOrMrn);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const existingSessionClaim = await BillingClaim.findOne({ session });

  if (existingSessionClaim) {
    return res.status(400).json({
      success: false,
      message: 'Claim already exists for this session',
      data: existingSessionClaim,
    });
  }

  if (claimReference) {
    const existingReference = await BillingClaim.findOne({
      claimReference,
    });

    if (existingReference) {
      return res.status(400).json({
        success: false,
        message: 'Claim reference already exists',
        data: existingReference,
      });
    }
  }

  const claim = await BillingClaim.create({
    ...claimData,
    patient: patient._id,
    session,
    claimReference, // if not provided, model pre validate will auto-generate
  });

  const populatedClaim = await BillingClaim.findById(claim._id).populate(
    'patient session'
  );

  res.status(201).json({
    success: true,
    message: 'Claim created successfully',
    data: populatedClaim,
  });
});

export const listClaims = asyncHandler(async (req, res) => {
  // Lazily turn due completed sessions into claims before listing (mirrors the
  // chair-cleaning buffer pattern — no separate worker needed).
  try { await generateDueClaims(); } catch (e) { /* non-fatal */ }

  const claims = await BillingClaim.find()
    .populate('patient session')
    .sort('-createdAt');

  res.json({
    success: true,
    data: claims,
  });
});

/**
 * POST /billing/claims/generate-due
 * Catch-up: bill any completed sessions that don't yet have a claim.
 */
export const generateClaims = asyncHandler(async (req, res) => {
  const created = await generateDueClaims();
  res.json({ success: true, data: { created }, message: created ? `${created} claim(s) generated from completed dialysis.` : 'No new claims to generate.' });
});

export const updateClaim = asyncHandler(async (req, res) => {
  const claim = await BillingClaim.findOneAndUpdate(
    findClaimQuery(req.params.id),
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!claim) {
    return res.status(404).json({
      success: false,
      message: 'Claim not found',
    });
  }

  res.json({
    success: true,
    data: claim,
  });
});

export const getClaim = asyncHandler(async (req, res) => {
  const claim = await BillingClaim.findOne(findClaimQuery(req.params.id))
    .populate('patient session');

  if (!claim) {
    return res.status(404).json({
      success: false,
      message: 'Claim not found',
    });
  }

  res.json({
    success: true,
    data: claim,
  });
});
/**
 * GET /billing/activity  — per-patient activity for a month (no fees).
 * Returns, per patient: dialysis sessions completed, MD rounds done, drugs given.
 */
export const getActivitySummary = asyncHandler(async (req, res) => {
  const { year, month, start, end } = monthRange(req.query);

  const [sessionsAgg, roundsAgg, medsAgg] = await Promise.all([
    DialysisSession.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$patient', count: { $sum: 1 } } },
    ]),
    DoctorCheckup.aggregate([
      { $match: { month, year } },
      { $group: { _id: '$patient', count: { $sum: 1 } } },
    ]),
    MedicationAdministration.aggregate([
      { $match: { month, year, status: { $ne: 'deleted' } } },
      { $group: { _id: '$patient', count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  const bump = (id, key, n) => {
    const k = String(id);
    if (!k || k === 'null') return;
    if (!map.has(k)) map.set(k, { patient: k, sessions: 0, rounds: 0, meds: 0 });
    map.get(k)[key] += n;
  };
  sessionsAgg.forEach((r) => bump(r._id, 'sessions', r.count));
  roundsAgg.forEach((r) => bump(r._id, 'rounds', r.count));
  medsAgg.forEach((r) => bump(r._id, 'meds', r.count));

  const ids = [...map.keys()].filter((k) => mongoose.Types.ObjectId.isValid(k));
  const patients = await Patient.find({ _id: { $in: ids } }).select('mrn firstName lastName').lean();
  const pMap = new Map(patients.map((p) => [String(p._id), p]));

  const rows = [...map.values()]
    .map((r) => ({ ...r, patientInfo: pMap.get(r.patient) || null }))
    .filter((r) => r.patientInfo)
    .sort((a, b) => `${a.patientInfo.lastName}`.localeCompare(`${b.patientInfo.lastName}`));

  const totals = rows.reduce(
    (t, r) => ({ sessions: t.sessions + r.sessions, rounds: t.rounds + r.rounds, meds: t.meds + r.meds }),
    { sessions: 0, rounds: 0, meds: 0 }
  );

  res.json({ success: true, data: { rows, totals, month, year }, message: 'Activity summary', errors: [] });
});

/**
 * GET /billing/daily  — daily service counts for a month (no fees).
 * dialysis services, MD services and drugs given, per day.
 */
export const getDailyServices = asyncHandler(async (req, res) => {
  const { year, month, start, end } = monthRange(req.query);
  const dayOf = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field } });

  const [sess, rounds, meds] = await Promise.all([
    DialysisSession.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start, $lt: end } } },
      { $group: { _id: dayOf('$completedAt'), count: { $sum: 1 } } },
    ]),
    DoctorCheckup.aggregate([
      { $match: { checkupDate: { $gte: start, $lt: end } } },
      { $group: { _id: dayOf('$checkupDate'), count: { $sum: 1 } } },
    ]),
    MedicationAdministration.aggregate([
      { $match: { date: { $gte: start, $lt: end }, status: { $ne: 'deleted' } } },
      { $group: { _id: dayOf('$date'), count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  const put = (rows, key) => rows.forEach((r) => {
    if (!map.has(r._id)) map.set(r._id, { date: r._id, dialysis: 0, md: 0, drugs: 0 });
    map.get(r._id)[key] = r.count;
  });
  put(sess, 'dialysis');
  put(rounds, 'md');
  put(meds, 'drugs');

  const rows = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, data: { rows, month, year }, message: 'Daily services', errors: [] });
});

/**
 * GET /billing/med-reconciliation?patient=&month=&year=
 * Monthly reconciliation: the patient's standing home meds vs in-unit
 * administrations for the month.
 */
export const getMedReconciliation = asyncHandler(async (req, res) => {
  const { patient: patientIdOrMrn } = req.query;
  if (!patientIdOrMrn) throw new ApiError(400, 'patient is required');
  const patient = await findPatientByIdOrMrn(patientIdOrMrn);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const { year, month } = monthRange(req.query);

  const [homeMeds, administrations] = await Promise.all([
    HomeMedication.find({ patient: patient._id, status: { $ne: 'deleted' } }).sort('name').lean(),
    MedicationAdministration.find({ patient: patient._id, month, year, status: { $ne: 'deleted' } }).sort('name').lean(),
  ]);

  res.json({
    success: true,
    data: {
      patient: { _id: patient._id, mrn: patient.mrn, firstName: patient.firstName, lastName: patient.lastName },
      homeMeds,
      administrations,
      month,
      year,
    },
    message: 'Medication reconciliation',
    errors: [],
  });
});

/**
 * GET /billing/summary?month&year
 * Billing overview for the biller: dialysis sessions done, doctor rounds done,
 * total medication usage, dialysis (session-linked) medication usage, and the
 * drugs used during dialysis (total quantity + top drugs).
 */
export const getBillingSummary = asyncHandler(async (req, res) => {
  const { year, month, start, end } = monthRange(req.query);

  const [dialysisSessions, doctorRounds, medsTotal, dialysisMeds, drugAgg] = await Promise.all([
    DialysisSession.countDocuments({ status: 'completed', completedAt: { $gte: start, $lt: end } }),
    DoctorCheckup.countDocuments({ month, year }),
    MedicationAdministration.countDocuments({ month, year, status: { $ne: 'deleted' } }),
    MedicationAdministration.countDocuments({ month, year, status: { $ne: 'deleted' }, session: { $ne: null } }),
    MedicationAdministration.aggregate([
      { $match: { month, year, status: { $ne: 'deleted' }, session: { $ne: null } } },
      { $group: { _id: '$name', qty: { $sum: { $ifNull: ['$quantity', 1] } }, doses: { $sum: 1 } } },
      { $sort: { qty: -1 } },
    ]),
  ]);

  const topDrugs = drugAgg.map((d) => ({ name: d._id || 'Unnamed', quantity: d.qty, doses: d.doses }));
  const drugsDuringDialysisQty = topDrugs.reduce((s, d) => s + (d.quantity || 0), 0);

  res.json({
    success: true,
    data: {
      month, year,
      dialysisSessions,
      doctorRounds,
      medicationUsage: medsTotal,
      dialysisMedicationUsage: dialysisMeds,
      drugsDuringDialysisQty,
      topDrugs,
    },
    message: 'Billing summary',
    errors: [],
  });
});
