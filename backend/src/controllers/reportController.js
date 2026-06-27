import asyncHandler from 'express-async-handler';
import XLSX from 'xlsx';
import Patient from '../models/Patient.js';
import Chair from '../models/Chair.js';
import Schedule from '../models/Schedule.js';
import DialysisSession from '../models/DialysisSession.js';
import BillingClaim from '../models/BillingClaim.js';
import DoctorCheckup from '../models/DoctorCheckup.js';
import { SOAP_ROUNDS } from '../utils/constants.js';

const countByStatus = (rows) =>
  rows.reduce((acc, row) => {
    const key = row?.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const monthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
};

/**
 * GET /api/v1/reports/overview
 * High-level operational + billing snapshot for dashboards / reports page.
 */
export const getOverviewReport = asyncHandler(async (_req, res) => {
  const [patients, chairs, sessions, schedules, claims] = await Promise.all([
    Patient.countDocuments({ status: 'active' }),
    Chair.find().select('status').lean(),
    DialysisSession.find().select('status').lean(),
    Schedule.find().select('status').lean(),
    BillingClaim.find().select('status amount paymentAmount').lean(),
  ]);

  const paidRevenue = claims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.paymentAmount || c.amount || 0), 0);

  res.json({
    success: true,
    data: {
      patients: { active: patients },
      chairs: { total: chairs.length, byStatus: countByStatus(chairs) },
      sessions: { total: sessions.length, byStatus: countByStatus(sessions) },
      schedules: { total: schedules.length, byStatus: countByStatus(schedules) },
      billing: {
        total: claims.length,
        byStatus: countByStatus(claims),
        paidRevenue,
      },
    },
    message: 'Operational overview generated',
    errors: [],
  });
});

/**
 * Build the monthly SOAP dataset:
 * doctor name, patient names, SOAP details, and per-patient completion count (x/4).
 */
const buildMonthlySoap = async (month, year) => {
  const checkups = await DoctorCheckup.find({ month, year })
    .populate('doctor', 'name email')
    .populate('patient', 'mrn firstName lastName')
    .sort({ patientMrn: 1, roundNumber: 1 })
    .lean();

  const totalRounds = SOAP_ROUNDS.length;
  const grouped = new Map();

  for (const c of checkups) {
    const key = c.patient?._id?.toString() || c.patientMrn;
    if (!grouped.has(key)) {
      grouped.set(key, {
        patientMrn: c.patientMrn,
        patientName: c.patient
          ? `${c.patient.firstName || ''} ${c.patient.lastName || ''}`.trim()
          : c.patientMrn,
        rounds: [],
      });
    }
    grouped.get(key).rounds.push({
      roundNumber: c.roundNumber,
      status: c.status,
      checkupDate: c.checkupDate,
      doctorName: c.doctor?.name || c.doctor?.email || 'Unknown',
      vitals: c.vitals || {},
      soap: c.soap || {},
      physicianRound: c.physicianRound || {},
      doctorComments: c.doctorComments || '',
      socialWorkerComments: c.socialWorkerComments || '',
      dietitianComments: c.dietitianComments || '',
      cqi: c.cqi || {},
      approvalStatus: c.approval?.status || 'pending',
    });
  }

  const patients = Array.from(grouped.values()).map((p) => {
    const completed = p.rounds.filter((r) => r.status === 'completed').length;
    return {
      ...p,
      completedCount: completed,
      totalRounds,
      isComplete: completed >= totalRounds,
    };
  });

  return {
    month,
    year,
    totalRounds,
    patientCount: patients.length,
    completedPatients: patients.filter((p) => p.isComplete).length,
    totalCheckups: checkups.length,
    patients,
  };
};

/**
 * GET /api/v1/reports/soap/monthly?month=&year=&format=json|xlsx
 * Calendar-based monthly SOAP report.
 */
export const getMonthlySoapReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const format = (req.query.format || 'json').toLowerCase();

  if (month < 1 || month > 12) {
    res.status(400);
    throw new Error('month must be between 1 and 12');
  }

  const report = await buildMonthlySoap(month, year);

  if (format === 'xlsx' || format === 'csv') {
    const flat = (obj = {}) =>
      Object.entries(obj)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(typeof v === 'object' && !Object.keys(v).length))
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('; ');

    const rows = [];
    report.patients.forEach((p) => {
      if (!p.rounds.length) {
        rows.push({ Patient: p.patientName, MRN: p.patientMrn, Month: `${month}/${year}`, Round: '-', Doctor: '-', 'Doctor Comments': '', 'Social Worker Comments': '', 'Dietitian Comments': '', CQI: '', 'Laboratory Review': '', 'Blood Pressure': '', 'Access Evaluation': '', Status: 'no rounds', Approval: '-', Completion: `${p.completedCount}/${p.totalRounds}` });
        return;
      }
      p.rounds.sort((a, b) => a.roundNumber - b.roundNumber).forEach((r) => {
        const lab = r.physicianRound?.laboratoryReview || {};
        rows.push({
          Patient: p.patientName,
          MRN: p.patientMrn,
          Month: `${month}/${year}`,
          Round: r.roundNumber,
          Doctor: r.doctorName,
          'Doctor Comments': r.doctorComments || r.soap?.doctorNotes || '',
          'Social Worker Comments': r.socialWorkerComments || '',
          'Dietitian Comments': r.dietitianComments || '',
          CQI: flat(r.cqi),
          'Laboratory Review': flat(lab),
          'Blood Pressure': lab.bloodPressure || r.vitals?.bloodPressure || '',
          'Access Evaluation': flat(r.physicianRound?.accessEvaluation || {}),
          Status: r.status,
          Approval: r.approvalStatus,
          Completion: `${p.completedCount}/${p.totalRounds}`,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rounds ${month}-${year}`);

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="doctor-rounds-${year}-${String(month).padStart(2, '0')}.csv"`);
      return res.send(csv);
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="doctor-rounds-${year}-${String(month).padStart(2, '0')}.xlsx"`);
    return res.send(buffer);
  }

  return res.json({
    success: true,
    data: report,
    message: 'Monthly SOAP report generated',
    errors: [],
  });
});

/**
 * GET /api/v1/reports/sessions/monthly?month=&year=
 * Treatment volume for a calendar month.
 */
export const getMonthlySessionReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const { start, end } = monthRange(month, year);

  const sessions = await DialysisSession.find({
    createdAt: { $gte: start, $lt: end },
  })
    .select('status completedAt')
    .lean();

  res.json({
    success: true,
    data: {
      month,
      year,
      total: sessions.length,
      completed: sessions.filter((s) => s.status === 'completed').length,
      byStatus: countByStatus(sessions),
    },
    message: 'Monthly session report generated',
    errors: [],
  });
});

/**
 * GET /api/v1/reports/dialysis-billing?month=&year=
 * Completed dialysis sessions prepared for CDMS billing submission.
 */
export const getDialysisBilling = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const { start, end } = monthRange(month, year);

  const sessions = await DialysisSession.find({
    status: 'completed',
    completedAt: { $gte: start, $lt: end },
  })
    .populate('patient', 'mrn firstName lastName')
    .populate('chair', 'code chairNumber')
    .lean();

  const countByPatient = {};
  sessions.forEach((s) => {
    const key = s.patient?._id?.toString() || s.patientMrn || 'unknown';
    countByPatient[key] = (countByPatient[key] || 0) + 1;
  });

  const rows = sessions.map((s) => {
    const durationMin = s.startedAt && s.completedAt
      ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000)
      : null;
    const key = s.patient?._id?.toString() || s.patientMrn || 'unknown';
    return {
      sessionId: s._id,
      patientName: s.patient ? `${s.patient.firstName || ''} ${s.patient.lastName || ''}`.trim() : '-',
      patientMrn: s.patient?.mrn || '-',
      chair: s.chair?.code || s.chair?.chairNumber || '-',
      treatmentDate: s.completedAt,
      durationMinutes: durationMin,
      treatmentCount: countByPatient[key],
      billingStatus: s.sentToBillerAt ? 'ready' : 'pending',
    };
  });

  res.json({
    success: true,
    data: { month, year, total: rows.length, rows },
    message: 'Dialysis billing prepared',
    errors: [],
  });
});
