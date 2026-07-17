import asyncHandler from 'express-async-handler';
import XLSX from 'xlsx';
import Medication from '../models/MedicationAdministration.js';import { buildMedicationWorkbook } from '../utils/medicationExcel.js';
import { buildMedicationUsageWorkbook } from '../utils/medicationUsageExcel.js';
import DialysisSession from '../models/DialysisSession.js';
import Patient from '../models/Patient.js';
import HomeMedication from '../models/HomeMedication.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

const monthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

const patientName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '-');

/**
 * POST /api/v1/medications/session/:sessionId
 * Record one or more medications given during a dialysis session (nurse).
 * body: { medications: [{ name, dose, unit, route, quantity, administrationTime, notes }] }
 */
export const recordSessionMedications = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const list = Array.isArray(req.body.medications) ? req.body.medications : [req.body];

  const session = await DialysisSession.findById(sessionId).populate('patient', 'mrn firstName lastName facility');
  if (!session) throw new ApiError(404, 'Session not found');

  const created = [];
  for (const m of list) {
    if (!m.name) continue;
    /* eslint-disable no-await-in-loop */
    const doc = await Medication.create({
      patient: session.patient?._id || session.patient,
      patientMrn: session.patient?.mrn,
      session: session._id,
      name: m.name,
      dose: Number(m.dose) || 0,
      unit: m.unit || 'mg',
      route: m.route || 'IV',
      quantity: Number(m.quantity) || 1,
      administrationTime: m.administrationTime ? new Date(m.administrationTime) : new Date(),
      givenBy: req.user._id,
      givenByName: req.user.name,
      notes: m.notes,
      facility: session.patient?.facility,
      status: 'active',
      addedAt: new Date(),
      addedByName: req.user.name,
      addedByRole: req.user.role,
    });
    created.push(doc);
  }

  res.status(201).json({ success: true, data: created, message: `Recorded ${created.length} medication(s)`, errors: [] });
});

/**
 * GET /api/v1/medications?patient=&session=&month=&year=
 */
export const listMedications = asyncHandler(async (req, res) => {
  const { patient, session, month, year, status, includeInactive } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (session) query.session = session;
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (status) query.status = status;
  // By default the active list hides soft-deleted rows (cancelled stay visible).
  else if (!includeInactive) query.status = { $ne: 'deleted' };

  const meds = await Medication.find(query)
    .populate('patient', 'mrn firstName lastName')
    .sort({ date: -1 })
    .lean();

  res.json({ success: true, data: meds, meta: { total: meds.length }, message: 'Medications fetched', errors: [] });
});

/**
 * DELETE /api/v1/medications/:id
 * SOFT delete — the row is kept (status='deleted') with deletedAt/By so the record
 * is never lost. Excluded from active views; still visible in the history trail.
 */
export const deleteMedication = asyncHandler(async (req, res) => {
  const med = await Medication.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Medication not found');

  med.status = 'deleted';
  med.deletedAt = new Date();
  med.deletedBy = req.user._id;
  med.deletedByName = req.user.name;
  med.deletedByRole = req.user.role;
  await med.save();

  await writeAudit({
    user: req.user,
    action: 'medication.delete',
    entity: 'MedicationAdministration',
    entityId: req.params.id,
  });

  res.json({ success: true, data: med, message: 'Medication removed (history kept)', errors: [] });
});

/**
 * PATCH /api/v1/medications/:id/cancel
 * A doctor or nurse stops a medication. Kept in history and reports, flagged
 * cancelled with cancelledAt/By and an optional reason.
 * body: { reason }
 */
export const cancelMedication = asyncHandler(async (req, res) => {
  const med = await Medication.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Medication not found');
  if (med.status === 'deleted') throw new ApiError(400, 'Medication was deleted');

  med.status = 'cancelled';
  med.cancelledAt = new Date();
  med.cancelledBy = req.user._id;
  med.cancelledByName = req.user.name;
  med.cancelledByRole = req.user.role;
  if (req.body?.reason) med.cancelReason = String(req.body.reason).trim();
  await med.save();

  await writeAudit({
    user: req.user,
    action: 'medication.cancel',
    entity: 'MedicationAdministration',
    entityId: req.params.id,
  });

  res.json({ success: true, data: med, message: 'Medication cancelled', errors: [] });
});

/**
 * GET /api/v1/medications/history?patient=&session=&month=&year=
 * Full lifecycle trail (active + cancelled + deleted) for the biller / reports.
 * Returns each medication with its added/cancelled/deleted stamps.
 */
export const getMedicationHistory = asyncHandler(async (req, res) => {
  const { patient, session, month, year } = req.query;
  const query = {};
  if (patient) query.patient = patient;
  if (session) query.session = session;
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);

  const meds = await Medication.find(query)
    .populate('patient', 'mrn firstName lastName')
    .sort({ date: -1 })
    .lean();

  const rows = meds.map((m) => ({
    _id: m._id,
    source: 'dialysis',
    patient: m.patient,
    patientMrn: m.patientMrn,
    session: m.session,
    name: m.name,
    dose: m.dose,
    unit: m.unit,
    route: m.route,
    quantity: m.quantity,
    status: m.status || 'active',
    addedAt: m.addedAt || m.createdAt,
    addedByName: m.addedByName || m.givenByName,
    addedByRole: m.addedByRole,
    cancelledAt: m.cancelledAt,
    cancelledByName: m.cancelledByName,
    cancelledByRole: m.cancelledByRole,
    cancelReason: m.cancelReason,
    deletedAt: m.deletedAt,
    deletedByName: m.deletedByName,
    deletedByRole: m.deletedByRole,
  }));

  // Include home medications in the activity trail (patient-scoped only).
  if (patient) {
    const homeQuery = { patient };
    const home = await HomeMedication.find(homeQuery)
      .populate('patient', 'mrn firstName lastName')
      .sort({ updatedAt: -1 })
      .lean();
    home.forEach((m) => rows.push({
      _id: m._id,
      source: 'home',
      patient: m.patient,
      patientMrn: m.patientMrn,
      name: m.name,
      dose: m.dose,
      unit: m.unit,
      route: m.route,
      quantity: m.quantity,
      frequency: m.frequency,
      status: m.status === 'discontinued' ? 'cancelled' : (m.status || 'active'),
      addedAt: m.addedAt || m.createdAt,
      addedByName: m.addedByName,
      addedByRole: m.addedByRole,
      cancelledAt: m.cancelledAt,
      cancelledByName: m.cancelledByName,
      cancelledByRole: m.cancelledByRole,
      cancelReason: m.cancelReason,
      deletedAt: m.deletedAt,
      deletedByName: m.deletedByName,
      deletedByRole: m.deletedByRole,
    }));
  }

  rows.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));

  res.json({ success: true, data: rows, meta: { total: rows.length }, message: 'Medication history', errors: [] });
});

/**
 * GET /api/v1/patients/:idOrMrn/medications  (grouped by session/date)
 */
export const getPatientMedicationHistory = asyncHandler(async (req, res) => {
  const { idOrMrn } = req.params;
  const patient = idOrMrn.match(/^[0-9a-fA-F]{24}$/)
    ? await Patient.findById(idOrMrn)
    : await Patient.findOne({ mrn: idOrMrn });
  if (!patient) throw new ApiError(404, 'Patient not found');

  const meds = await Medication.find({ patient: patient._id, status: { $ne: 'deleted' } })
    .populate('session', 'completedAt startedAt status')
    .sort({ date: -1 })
    .lean();

  // group by session/date
  const groups = new Map();
  meds.forEach((m) => {
    const key = m.session?._id?.toString() || (m.date ? new Date(m.date).toISOString().slice(0, 10) : 'unknown');
    if (!groups.has(key)) {
      groups.set(key, { key, date: m.session?.completedAt || m.date, sessionId: m.session?._id, medications: [] });
    }
    groups.get(key).medications.push(m);
  });

  res.json({ success: true, data: Array.from(groups.values()), message: 'Medication history fetched', errors: [] });
});

/**
 * GET /api/v1/patients/:idOrMrn/monthly-summary?month=&year=
 * Consolidated: dialysis sessions, doctor rounds, medication totals.
 */
export const getPatientMonthlySummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const { start, end } = monthRange(month, year);

  const patient = req.params.idOrMrn.match(/^[0-9a-fA-F]{24}$/)
    ? await Patient.findById(req.params.idOrMrn)
    : await Patient.findOne({ mrn: req.params.idOrMrn });
  if (!patient) throw new ApiError(404, 'Patient not found');

  const [sessionCount, meds] = await Promise.all([
    DialysisSession.countDocuments({ patient: patient._id, status: 'completed', completedAt: { $gte: start, $lt: end } }),
    Medication.find({ patient: patient._id, month, year, status: { $ne: 'deleted' } }).lean(),
  ]);

  // total per medication (dose*quantity), keeping unit
  const totals = {};
  meds.forEach((m) => {
    const key = m.name;
    totals[key] = totals[key] || { name: m.name, unit: m.unit, total: 0, count: 0 };
    totals[key].total += (Number(m.dose) || 0) * (Number(m.quantity) || 1);
    totals[key].count += 1;
  });

  // doctor rounds count for the month (best-effort; model may be absent)
  let doctorRounds = 0;
  try {
    const DoctorCheckup = (await import('../models/DoctorCheckup.js')).default;
    doctorRounds = await DoctorCheckup.countDocuments({ patient: patient._id, month, year });
  } catch { /* ignore */ }

  res.json({
    success: true,
    data: {
      patient: { id: patient._id, mrn: patient.mrn, name: patientName(patient) },
      month, year,
      dialysisSessions: sessionCount,
      doctorRounds,
      medications: Object.values(totals),
    },
    message: 'Monthly summary generated',
    errors: [],
  });
});

// Common medication columns for the administration report pivot
const REPORT_MEDS = ['Heparin', 'Epogen', 'Calcitriol', 'Venofer', 'Benadryl', 'IDPN', 'LiquaCel', 'Oxygen', 'Sensipar', 'Tums'];

/**
 * GET /api/v1/medications/report?month=&year=
 * Medication Administration Report — pivot: patient rows x medication columns.
 */
export const getMedicationReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());

  let patientId;
  if (req.query.patient) {
    const pt = req.query.patient.match(/^[0-9a-fA-F]{24}$/) ? await Patient.findById(req.query.patient) : await Patient.findOne({ mrn: req.query.patient });
    patientId = pt?._id;
  }

  const meds = await Medication.find({ month, year, status: { $ne: 'deleted' }, ...(patientId ? { patient: patientId } : {}) }).populate('patient', 'mrn firstName lastName facility insuranceProvider').populate('session', 'startedAt completedAt createdAt').lean();
  const sessions = await DialysisSession.find({ status: 'completed', completedAt: { $ne: null } })
    .where('completedAt').gte(monthRange(month, year).start).lt(monthRange(month, year).end)
    .select('patient').lean();

  const hdByPatient = {};
  sessions.forEach((s) => { const k = s.patient?.toString(); hdByPatient[k] = (hdByPatient[k] || 0) + 1; });

  const rowByPatient = new Map();
  meds.forEach((m) => {
    const pid = m.patient?._id?.toString() || m.patientMrn;
    if (!rowByPatient.has(pid)) {
      rowByPatient.set(pid, {
        patientName: patientName(m.patient),
        mrn: m.patient?.mrn || m.patientMrn,
        facility: m.patient?.facility || '',
        insurance: m.patient?.insuranceProvider || '',
        hdQty: hdByPatient[pid] || 0,
        meds: {},
      });
    }
    const row = rowByPatient.get(pid);
    const total = (Number(m.dose) || 0) * (Number(m.quantity) || 1);
    row.meds[m.name] = (row.meds[m.name] || 0) + total;
  });

  const rows = Array.from(rowByPatient.values());

  const format = req.query.format;
  if (format === 'csv') {
    // CSV stays flat: one line per administration
    const detailed = [...meds]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((m) => {
        const d = m.administrationTime || m.date;
        const dt = d ? new Date(d) : null;
        return {
          Patient: patientName(m.patient),
          MRN: m.patient?.mrn || m.patientMrn || '',
          Date: dt ? dt.toISOString().slice(0, 10) : '',
          Time: dt ? dt.toISOString().slice(11, 16) : '',
          Medication: m.name,
          Dose: m.dose,
          Unit: m.unit,
          Route: m.route,
          Quantity: m.quantity,
          Status: m.status === 'cancelled' ? 'Stopped' : m.status === 'deleted' ? 'Removed' : 'Active',
          'Stopped/Removed By': m.cancelledByName || m.deletedByName || '',
          'Stop Reason': m.cancelReason || '',
          'Stopped/Removed At': (m.cancelledAt || m.deletedAt) ? new Date(m.cancelledAt || m.deletedAt).toISOString().slice(0, 16).replace('T', ' ') : '',
          Nurse: m.givenByName || '',
          Notes: m.notes || '',
        };
      });
    const ws = XLSX.utils.json_to_sheet(detailed.length ? detailed : [{ Patient: '', MRN: '', Date: '', Time: '', Medication: '', Dose: '', Unit: '', Route: '', Quantity: '', Status: '', 'Stopped/Removed By': '', 'Stop Reason': '', 'Stopped/Removed At': '', Nurse: '', Notes: '' }]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="medication-report-${year}-${String(month).padStart(2, '0')}.csv"`);
    return res.send(XLSX.utils.sheet_to_csv(ws));
  }
  if (format === 'xlsx') {
    // Professional workbook grouped by dialysis session + monthly summary
    const wb = await buildMedicationWorkbook(meds, month, year);
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="medication-report-${year}-${String(month).padStart(2, '0')}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  res.json({
    success: true,
    data: { month, year, columns: REPORT_MEDS, rows },
    message: 'Medication report generated',
    errors: [],
  });
});

/**
 * GET /api/v1/medications/billing?month=&year=
 * Medication billing rows (per administration).
 */
export const getMedicationBilling = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());

  const meds = await Medication.find({ month, year, status: { $ne: 'deleted' } })
    .populate('patient', 'mrn firstName lastName')
    .sort({ date: -1 })
    .lean();

  const rows = meds.map((m) => ({
    id: m._id,
    patientName: patientName(m.patient),
    mrn: m.patient?.mrn || m.patientMrn,
    medication: m.name,
    dose: m.dose,
    unit: m.unit,
    quantity: m.quantity,
    route: m.route,
    administrationDate: m.date,
    nurse: m.givenByName || '-',
    billingStatus: m.billingStatus,
  }));

  res.json({ success: true, data: { month, year, total: rows.length, rows }, message: 'Medication billing prepared', errors: [] });
});

/**
 * GET /api/v1/medications/usage
 * Dialysis medication CONSUMPTION report.
 *   Daily  (end-of-day):   ?date=YYYY-MM-DD
 *   Monthly(end-of-month): ?month=&year=
 * Optional: ?patient=<id|mrn> for an individual patient (otherwise all patients).
 * Optional: ?format=xlsx|csv to download.
 *
 * Returns per-medication totals (how much of each was used), a per-patient
 * breakdown, and grand totals.
 */
export const getMedicationUsage = asyncHandler(async (req, res) => {
  const now = new Date();

  // Build the date query + a human-readable scope label.
  let dateQuery = {};
  let scopeLabel = '';
  if (req.query.from && req.query.to) {
    const f = new Date(req.query.from);
    const t = new Date(req.query.to);
    const start = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()));
    const end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1));
    dateQuery = { date: { $gte: start, $lt: end } };
    scopeLabel = `${start.toISOString().slice(0, 10)} to ${t.toISOString().slice(0, 10)}`;
  } else if (req.query.week) {
    // Weekly: ?week=YYYY-MM-DD (any day in the week). Week runs Mon–Sun.
    const d = new Date(req.query.week);
    const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7));
    dateQuery = { date: { $gte: start, $lt: end } };
    scopeLabel = `Week of ${start.toISOString().slice(0, 10)}`;
  } else if (req.query.date) {
    const d = new Date(req.query.date);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
    dateQuery = { date: { $gte: start, $lt: end } };
    scopeLabel = `Day of ${start.toISOString().slice(0, 10)}`;
  } else {
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());
    dateQuery = { month, year };
    scopeLabel = `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1]} ${year}`;
  }

  // Resolve the window's [start, end) for filtering lifecycle events by timestamp.
  let winStart;
  let winEnd;
  if (dateQuery.date) {
    winStart = dateQuery.date.$gte;
    winEnd = dateQuery.date.$lt;
  } else {
    winStart = new Date(Date.UTC(dateQuery.year, dateQuery.month - 1, 1));
    winEnd = new Date(Date.UTC(dateQuery.year, dateQuery.month, 1));
  }

  // Optional single-patient filter.
  let patientId;
  let patientLabel = '';
  if (req.query.patient) {
    const pt = req.query.patient.match(/^[0-9a-fA-F]{24}$/)
      ? await Patient.findById(req.query.patient)
      : await Patient.findOne({ mrn: req.query.patient });
    patientId = pt?._id;
    patientLabel = pt ? `${patientName(pt)} (${pt.mrn})` : '';
  }

  const meds = await Medication.find({ ...dateQuery, status: { $ne: 'deleted' }, ...(patientId ? { patient: patientId } : {}) })
    .populate('patient', 'mrn firstName lastName')
    .lean();

  // Per-medication totals.
  const totalsMap = new Map();
  const patientSet = new Set();
  meds.forEach((m) => {
    const pid = m.patient?._id?.toString() || m.patientMrn || 'unknown';
    patientSet.add(pid);
    const key = `${m.name}||${m.unit || ''}`;
    if (!totalsMap.has(key)) {
      totalsMap.set(key, { name: m.name, unit: m.unit || '', totalDose: 0, totalQty: 0, administrations: 0, _pats: new Set() });
    }
    const t = totalsMap.get(key);
    t.totalDose += (Number(m.dose) || 0) * (Number(m.quantity) || 1);
    t.totalQty += Number(m.quantity) || 1;
    t.administrations += 1;
    t._pats.add(pid);
  });
  const totals = Array.from(totalsMap.values())
    .map((t) => ({ name: t.name, unit: t.unit, totalDose: Math.round(t.totalDose * 1000) / 1000, totalQty: t.totalQty, administrations: t.administrations, patients: t._pats.size }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Per-patient breakdown.
  const byPatientMap = new Map();
  meds.forEach((m) => {
    const pid = m.patient?._id?.toString() || m.patientMrn || 'unknown';
    if (!byPatientMap.has(pid)) {
      byPatientMap.set(pid, { patientName: patientName(m.patient), mrn: m.patient?.mrn || m.patientMrn || '', administrations: 0, totalQty: 0, _meds: new Map() });
    }
    const p = byPatientMap.get(pid);
    p.administrations += 1;
    p.totalQty += Number(m.quantity) || 1;
    const mk = `${m.name}||${m.unit || ''}`;
    if (!p._meds.has(mk)) p._meds.set(mk, { name: m.name, unit: m.unit || '', totalDose: 0, totalQty: 0 });
    const mm = p._meds.get(mk);
    mm.totalDose += (Number(m.dose) || 0) * (Number(m.quantity) || 1);
    mm.totalQty += Number(m.quantity) || 1;
  });
  const byPatient = Array.from(byPatientMap.values())
    .map((p) => ({ patientName: p.patientName, mrn: p.mrn, administrations: p.administrations, totalQty: p.totalQty, meds: Array.from(p._meds.values()).map((x) => ({ ...x, totalDose: Math.round(x.totalDose * 1000) / 1000 })) }))
    .sort((a, b) => a.patientName.localeCompare(b.patientName));

  const grand = { administrations: meds.length, patients: patientSet.size, medications: totals.length };

  // Per-date breakdown (date-wise report). Groups every administration by calendar day.
  const byDateMap = new Map();
  meds.forEach((m) => {
    const key = new Date(m.date).toISOString().slice(0, 10);
    if (!byDateMap.has(key)) byDateMap.set(key, { date: key, administrations: 0, totalQty: 0, _meds: new Map(), _pats: new Set() });
    const d = byDateMap.get(key);
    d.administrations += 1;
    d.totalQty += Number(m.quantity) || 1;
    d._pats.add(m.patient?._id?.toString() || m.patientMrn || 'unknown');
    const mk = `${m.name}||${m.unit || ''}`;
    if (!d._meds.has(mk)) d._meds.set(mk, { name: m.name, unit: m.unit || '', totalDose: 0, totalQty: 0 });
    const mm = d._meds.get(mk);
    mm.totalDose += (Number(m.dose) || 0) * (Number(m.quantity) || 1);
    mm.totalQty += Number(m.quantity) || 1;
  });
  const byDate = Array.from(byDateMap.values())
    .map((d) => ({ date: d.date, administrations: d.administrations, totalQty: d.totalQty, patients: d._pats.size, meds: Array.from(d._meds.values()).map((x) => ({ ...x, totalDose: Math.round(x.totalDose * 1000) / 1000 })) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---- Lifecycle events (added / stopped / removed) within the window ----
  // Pulls from both dialysis medications and home medications so the report shows
  // when meds were added, cancelled/stopped and removed, and by whom.
  const patientClause = patientId ? { patient: patientId } : {};
  const inWindow = { $gte: winStart, $lt: winEnd };

  const [dialForEvents, homeForEvents] = await Promise.all([
    Medication.find({
      ...patientClause,
      $or: [{ addedAt: inWindow }, { cancelledAt: inWindow }, { deletedAt: inWindow }],
    }).populate('patient', 'mrn firstName lastName').lean(),
    HomeMedication.find({
      ...patientClause,
      $or: [{ addedAt: inWindow }, { cancelledAt: inWindow }, { deletedAt: inWindow }, { createdAt: inWindow }],
    }).populate('patient', 'mrn firstName lastName').lean(),
  ]);

  const events = [];
  const pushEvent = (m, kind, at, byName, byRole, source, reason) => {
    if (!at || at < winStart || at >= winEnd) return;
    events.push({
      kind, // 'added' | 'stopped' | 'removed'
      at,
      source, // 'dialysis' | 'home'
      medication: m.name,
      dose: m.dose,
      unit: m.unit,
      patientName: patientName(m.patient),
      mrn: m.patient?.mrn || m.patientMrn || '',
      byName: byName || '',
      byRole: byRole || '',
      reason: reason || '',
    });
  };
  dialForEvents.forEach((m) => {
    pushEvent(m, 'added', m.addedAt, m.addedByName || m.givenByName, m.addedByRole, 'dialysis');
    pushEvent(m, 'stopped', m.cancelledAt, m.cancelledByName, m.cancelledByRole, 'dialysis', m.cancelReason);
    pushEvent(m, 'removed', m.deletedAt, m.deletedByName, m.deletedByRole, 'dialysis');
  });
  homeForEvents.forEach((m) => {
    pushEvent(m, 'added', m.addedAt || m.createdAt, m.addedByName, m.addedByRole, 'home');
    pushEvent(m, 'stopped', m.cancelledAt, m.cancelledByName, m.cancelledByRole, 'home', m.cancelReason);
    pushEvent(m, 'removed', m.deletedAt, m.deletedByName, m.deletedByRole, 'home');
  });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  const eventSummary = {
    added: events.filter((e) => e.kind === 'added').length,
    stopped: events.filter((e) => e.kind === 'stopped').length,
    removed: events.filter((e) => e.kind === 'removed').length,
  };

  const payload = { scopeLabel, patientName: patientLabel, totals, byPatient, byDate, grand, events, eventSummary };

  const format = req.query.format;
  const fileBase = `medication-usage-${(req.query.from && req.query.to) ? `${req.query.from}_to_${req.query.to}` : (req.query.week ? `week-${req.query.week}` : (req.query.date || `${dateQuery.year || ''}-${String(dateQuery.month || '').padStart(2, '0')}`))}`;

  if (format === 'csv') {
    const flat = totals.map((t) => ({
      Scope: scopeLabel,
      Patient: patientLabel || 'All patients',
      Medication: t.name,
      Unit: t.unit,
      TotalDose: t.totalDose,
      TotalQuantity: t.totalQty,
      Administrations: t.administrations,
      Patients: t.patients,
    }));
    const ws = XLSX.utils.json_to_sheet(flat.length ? flat : [{ Scope: scopeLabel, Patient: patientLabel || 'All patients', Medication: '', Unit: '', TotalDose: '', TotalQuantity: '', Administrations: '', Patients: '' }]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.csv"`);
    return res.send(XLSX.utils.sheet_to_csv(ws));
  }
  if (format === 'xlsx') {
    const wb = await buildMedicationUsageWorkbook(payload);
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  res.json({ success: true, data: payload, message: 'Medication usage generated', errors: [] });
});
