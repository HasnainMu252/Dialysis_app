import asyncHandler from 'express-async-handler';
import XLSX from 'xlsx';
import Medication from '../models/MedicationAdministration.js';
import { buildMedicationWorkbook } from '../utils/medicationExcel.js';
import DialysisSession from '../models/DialysisSession.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';

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
    });
    created.push(doc);
  }

  res.status(201).json({ success: true, data: created, message: `Recorded ${created.length} medication(s)`, errors: [] });
});

/**
 * GET /api/v1/medications?patient=&session=&month=&year=
 */
export const listMedications = asyncHandler(async (req, res) => {
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

  res.json({ success: true, data: meds, meta: { total: meds.length }, message: 'Medications fetched', errors: [] });
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

  const meds = await Medication.find({ patient: patient._id })
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
    Medication.find({ patient: patient._id, month, year }).lean(),
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

  const meds = await Medication.find({ month, year, ...(patientId ? { patient: patientId } : {}) }).populate('patient', 'mrn firstName lastName facility insuranceProvider').populate('session', 'startedAt completedAt createdAt').lean();
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
          Nurse: m.givenByName || '',
          Notes: m.notes || '',
        };
      });
    const ws = XLSX.utils.json_to_sheet(detailed.length ? detailed : [{ Patient: '', MRN: '', Date: '', Time: '', Medication: '', Dose: '', Unit: '', Route: '', Quantity: '', Nurse: '', Notes: '' }]);
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

  const meds = await Medication.find({ month, year })
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
