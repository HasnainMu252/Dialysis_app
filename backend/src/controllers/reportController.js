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

  if (format === 'xlsx') {
    const rows = [];
    report.patients.forEach((p) => {
      if (!p.rounds.length) {
        rows.push({
          MRN: p.patientMrn,
          Patient: p.patientName,
          Round: '-',
          Status: 'no rounds',
          Doctor: '-',
          Date: '-',
          Subjective: '',
          Objective: '',
          Assessment: '',
          Plan: '',
          Completion: `${p.completedCount}/${p.totalRounds}`,
        });
        return;
      }
      p.rounds
        .sort((a, b) => a.roundNumber - b.roundNumber)
        .forEach((r) => {
          rows.push({
            MRN: p.patientMrn,
            Patient: p.patientName,
            Round: r.roundNumber,
            Status: r.status,
            Doctor: r.doctorName,
            Date: r.checkupDate ? new Date(r.checkupDate).toISOString().slice(0, 10) : '-',
            Subjective: r.soap.subjective || '',
            Objective: r.soap.objective || '',
            Assessment: r.soap.assessment || '',
            Plan: r.soap.plan || '',
            Completion: `${p.completedCount}/${p.totalRounds}`,
          });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `SOAP ${month}-${year}`);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="soap-report-${year}-${String(month).padStart(2, '0')}.xlsx"`
    );
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
