import asyncHandler from 'express-async-handler';
import Schedule from '../models/Schedule.js';
import DialysisSession from '../models/DialysisSession.js';
import { cascadeDeletePatientData } from '../services/patientCascadeService.js';
import { generateRecurringForPatient } from '../services/recurringScheduleService.js';
import mongoose from 'mongoose';
import XLSX from 'xlsx';

import Patient from '../models/Patient.js';
import { writeAudit } from '../utils/audit.js';
import { generateMrn } from '../utils/generateMrn.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/response.js';
import { visiblePatientFields } from '../utils/permissions.js';
import { ROLES } from '../utils/constants.js';

const getPatientQuery = (id) => (mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { mrn: String(id).toUpperCase() });

const splitText = (value) => {
  if (!value) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const cleanDate = (value) => {
  if (!value || value === 'Not specified') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizePatientBody = (body) => {
  const payload = { ...body };

  if (payload.mrn) payload.mrn = String(payload.mrn).trim().toUpperCase();
  if (payload.firstName) payload.firstName = payload.firstName.trim();
  if (payload.lastName) payload.lastName = payload.lastName.trim();
  if (payload.phone) payload.phone = payload.phone.trim();
  if (payload.email) payload.email = payload.email.trim().toLowerCase();
  if (payload.address) payload.address = payload.address.trim();

  // Assigned treatment shift (1/2/3). Empty string -> null.
  if (payload.shift === '' || payload.shift === undefined || payload.shift === null) {
    payload.shift = null;
  } else {
    const n = Number(payload.shift);
    payload.shift = [1, 2, 3].includes(n) ? n : null;
  }

  // Dialysis day pattern (mwf/tts). Empty -> null.
  if (payload.dayPattern === '' || payload.dayPattern === undefined) {
    payload.dayPattern = null;
  } else if (payload.dayPattern !== null) {
    const dp = String(payload.dayPattern).toLowerCase();
    payload.dayPattern = ['mwf', 'tts'].includes(dp) ? dp : null;
  }

  // Recurring: accept a plain boolean (recurringActive) from the form and fold
  // it into the recurring sub-object without clobbering generator bookkeeping.
  if (payload.recurringActive !== undefined) {
    payload.recurring = {
      ...(payload.recurring || {}),
      active: payload.recurringActive === true || payload.recurringActive === 'true',
    };
    delete payload.recurringActive;
  }

  if (payload.insurance?.careCoordinationFlags) {
    payload.insurance.careCoordinationFlags = Array.isArray(payload.insurance.careCoordinationFlags)
      ? payload.insurance.careCoordinationFlags
      : splitText(payload.insurance.careCoordinationFlags);
  }

  if (payload.insurance?.approvalStatus && !payload.insurance.coverageStatus) {
    payload.insurance.coverageStatus = payload.insurance.approvalStatus;
  }

  return payload;
};

const restrictPatientWrite = (req, payload) => {
  if (
    [
      ROLES.ADMIN,
      ROLES.BILLER,
      ROLES.INSURANCE_PERSON,
    ].includes(req.user.role)
  ) {
    return payload;
  }

  if (req.user.role === ROLES.FRONT_DESK) {
    const { insurance, registration, ...rest } = payload;

    return {
      ...rest,
      registration: {
        ...registration,
        ssn: undefined,
        spouseSsn: undefined,
      },
    };
  }

  throw new ApiError(
    403,
    'You do not have permission to modify patient records'
  );
};

export const createPatient = asyncHandler(async (req, res) => {
  const payload = restrictPatientWrite(req, normalizePatientBody(req.body));

  if (!payload.mrn) payload.mrn = await generateMrn();

  const patient = await Patient.create(payload);

  // Auto-build the recurring schedule whenever a pattern + shift are set.
  try { await generateRecurringForPatient(patient, { bookedBy: req.user?._id }); } catch (e) { /* non-fatal */ }

  await writeAudit({ user: req.user, action: 'patient.create', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, { statusCode: 201, message: 'Patient created successfully', data: patient });
});

// Build the Mongo filter shared by the list, the id-list and the export, so the
// three stay perfectly in sync (what you see, what "select all" acts on, and
// what you export are the same records).
const buildPatientQuery = (query = {}) => {
  const search = query.search?.trim();

  const q = search
    ? {
        $or: [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { mrn: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { 'insurance.memberId': new RegExp(search, 'i') },
          { 'insurance.payerName': new RegExp(search, 'i') },
          { 'insurance.providerName': new RegExp(search, 'i') },
        ],
      }
    : {};

  // Filter by assigned shift (1/2/3) when provided.
  if (query.shift && [1, 2, 3].includes(Number(query.shift))) {
    q.shift = Number(query.shift);
  }

  // Filter by day pattern (mwf/tts) when provided.
  if (query.dayPattern && ['mwf', 'tts'].includes(String(query.dayPattern).toLowerCase())) {
    q.dayPattern = String(query.dayPattern).toLowerCase();
  }

  return q;
};

export const listPatients = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const skip = (page - 1) * limit;

  const q = buildPatientQuery(req.query);

  const [data, total] = await Promise.all([
    Patient.find(q).select(visiblePatientFields(req.user.role)).sort('-createdAt').skip(skip).limit(limit).lean({ virtuals: true }),
    Patient.countDocuments(q),
  ]);

  // NOTE: sendSuccess spreads `meta` onto the top level of the body, so the
  // client reads total/page/pages from the body root (and body.meta as a fallback).
  return sendSuccess(res, { data, meta: { count: data.length, total, page, pages: Math.ceil(total / limit) } });
});

/**
 * GET /api/v1/patients/ids
 * Lightweight id list for the current filter, with NO pagination — powers the
 * "select all N patients" action so bulk delete can act on every match, not
 * just the page on screen.
 */
export const listPatientIds = asyncHandler(async (req, res) => {
  const q = buildPatientQuery(req.query);
  const docs = await Patient.find(q).select('_id mrn').sort('-createdAt').lean();
  return sendSuccess(res, { data: docs, meta: { total: docs.length } });
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne(getPatientQuery(req.params.id))
    .select(visiblePatientFields(req.user.role))
    .lean({ virtuals: true });

  if (!patient) throw new ApiError(404, 'Patient not found');

  return sendSuccess(res, { data: patient });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const payload = restrictPatientWrite(req, normalizePatientBody(req.body));

  const patient = await Patient.findOneAndUpdate(getPatientQuery(req.params.id), payload, {
    new: true,
    runValidators: true,
    projection: visiblePatientFields(req.user.role),
  });

  if (!patient) throw new ApiError(404, 'Patient not found');

  // Auto-build/refresh the recurring schedule (no-op when stopped or no pattern/shift).
  try { await generateRecurringForPatient(patient._id, { bookedBy: req.user?._id }); } catch (e) { /* non-fatal */ }

  await writeAudit({ user: req.user, action: 'patient.update', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, { message: 'Patient updated successfully', data: patient });
});

export const sendToBiller = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndUpdate(
    getPatientQuery(req.params.id),
    { sentToBillerAt: new Date(), 'insurance.approvalStatus': 'submitted', 'insurance.coverageStatus': 'submitted' },
    { new: true, runValidators: true, projection: visiblePatientFields(req.user.role) }
  );

  if (!patient) throw new ApiError(404, 'Patient not found');

  await writeAudit({ user: req.user, action: 'patient.send_to_biller', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, { message: 'Patient sent to biller successfully', data: patient });
});

export const bulkUploadPatients = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Excel file is required');

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) throw new ApiError(400, 'Excel file is empty');

  const patients = [];

  for (const row of rows) {
    const fullName = String(row['Patient Name'] || '').trim();
    const parts = fullName.split(' ').filter(Boolean);
    const firstName = String(row['First Name'] || parts[0] || '').trim();
    const lastName = String(row['Last Name'] || parts.slice(1).join(' ') || '').trim();

    if (!firstName || !lastName) continue;
    // Skip the template's example row so it never becomes a real patient.
    if (firstName === 'John' && lastName === 'Smith' && String(row.Email || '').trim() === 'john.smith@email.com') continue;

    patients.push({
      mrn: row.MRN ? String(row.MRN).trim().toUpperCase() : await generateMrn(),
      firstName,
      lastName,
      dob: cleanDate(row.DOB),
      gender: row.Gender ? String(row.Gender).trim().toLowerCase() : undefined,
      phone: row.Phone || '',
      email: row.Email || '',
      address: row.Address || '',
      referralSource: row['Referral Source'] || '',
      emergencyContact: {
        name: row['Emergency Contact Name'] || '',
        relation: row['Emergency Contact Relation'] || '',
        phone: row['Emergency Contact Phone'] || '',
      },
      medicalHistory: {
        diagnosis: row.Diagnosis || '',
        dialysisFrequency: row['Dialysis Frequency'] || '',
        allergies: splitText(row.Allergies),
        accessType: row['Access Type'] || '',
        notes: row['Medical Notes'] || '',
      },
      insurance: {
        providerName: row['Provider Name'] || '',
        payerName: row['Insurance / Payer'] || '',
        policyNumber: row['Policy Number'] || '',
        groupNumber: row['Group Number'] || '',
        memberId: row['Member ID'] || '',
        coverageStatus: row['Coverage Status'] || 'not_submitted',
        approvalStatus: row['Coverage Status'] || 'not_submitted',
        approvalValidTo: cleanDate(row['Insurance Expiry Date']),
        planType: row['Plan Type'] || '',
        ipaMedicalGroup: row['IPA / Medical Group'] || '',
        pcpName: row['PCP Name'] || '',
        dialysisCoverage: row['Dialysis Coverage'] || '',
        authorizationRequired: String(row['Authorization Required']).toLowerCase() === 'true',
        transportationBenefits: row['Transportation Benefits'] || '',
        deductible: row.Deductible || '',
        coinsurance: row.Coinsurance || '',
        oopMax: row['OOP Max'] || '',
        careCoordinationFlags: splitText(row['Care Coordination Flags']),
        sourceFile: row['Source File'] || '',
      },
      status: row.Status || 'active',
    });
  }

  if (!patients.length) throw new ApiError(400, 'No valid patient rows found');

  let inserted = [];
  let failed = 0;

  try {
    inserted = await Patient.insertMany(patients, { ordered: false });
  } catch (error) {
    inserted = error.insertedDocs || [];
    failed = patients.length - inserted.length;
  }

  await writeAudit({ user: req.user, action: 'patient.bulk_upload', entity: 'Patient', entityId: null });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Bulk upload completed',
    data: { totalRows: rows.length, validRows: patients.length, uploaded: inserted.length, failed },
  });
});

export const bulkDeletePatients = asyncHandler(async (req, res) => {
  const { ids = [], mrns = [] } = req.body;

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const query = { $or: [] };

  if (validIds.length) query.$or.push({ _id: { $in: validIds } });
  if (mrns.length) query.$or.push({ mrn: { $in: mrns.map((mrn) => String(mrn).toUpperCase()) } });

  if (!query.$or.length) throw new ApiError(400, 'Please provide valid patient ids or mrns');

  // Collect the ids first so we can cascade-delete their related records.
  const toDelete = await Patient.find(query).select('_id').lean();
  const deleteIds = toDelete.map((p) => p._id);

  const result = await Patient.deleteMany(query);

  // Remove related records for all deleted patients (schedules, sessions, etc.).
  let removed = {};
  if (deleteIds.length) {
    removed = await cascadeDeletePatientData(deleteIds);
  }

  await writeAudit({ user: req.user, action: 'patient.bulk_delete', entity: 'Patient', entityId: null });

  return sendSuccess(res, { message: 'Patients deleted successfully', data: { deletedCount: result.deletedCount, removed } });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndDelete(getPatientQuery(req.params.id)).select('mrn firstName lastName');

  if (!patient) throw new ApiError(404, 'Patient not found');

  // Remove all related records (schedules, sessions, meds, labs, etc.) so nothing
  // is left orphaned — otherwise deleted patients show as "Unknown" in the flow.
  const removed = await cascadeDeletePatientData(patient._id);

  await writeAudit({ user: req.user, action: 'patient.delete', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, {
    message: 'Patient deleted successfully',
    data: { id: patient._id, mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}`, removed },
  });
});

export const getInsuranceFormByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const form = await InsuranceForm.findOne({
    patient: patientId,
  })
    .populate('patient', 'mrn firstName lastName dob gender phone email')
    .populate('documents.uploadedBy', 'name email role');

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  res.status(200).json({
    success: true,
    data: form,
  });
});

export const findPatient = getPatient;

/**
 * GET /api/v1/patients/export
 * One-click Excel export of all patients, using the SAME column headers the
 * bulk-upload importer reads, so the file can be re-uploaded unchanged.
 */
export const exportPatients = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { mrn: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  const patients = await Patient.find(query).sort({ createdAt: -1 }).lean();
  const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

  const rows = patients.map((p) => {
    const m = p.medicalHistory || {};
    const i = p.insurance || {};
    const e = p.emergencyContact || {};
    return {
      MRN: p.mrn || '',
      'Patient Name': `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      'First Name': p.firstName || '',
      'Last Name': p.lastName || '',
      DOB: fmtDate(p.dob),
      Gender: p.gender || '',
      Phone: p.phone || '',
      Email: p.email || '',
      Address: p.address || '',
      'Referral Source': p.referralSource || '',
      'Emergency Contact Name': e.name || '',
      'Emergency Contact Relation': e.relation || '',
      'Emergency Contact Phone': e.phone || '',
      Diagnosis: m.diagnosis || '',
      'Dialysis Frequency': m.dialysisFrequency || '',
      Allergies: (m.allergies || []).join(', '),
      'Access Type': m.accessType || '',
      'Medical Notes': m.notes || '',
      'Provider Name': i.providerName || '',
      'Insurance / Payer': i.payerName || '',
      'Policy Number': i.policyNumber || '',
      'Group Number': i.groupNumber || '',
      'Member ID': i.memberId || '',
      'Coverage Status': i.coverageStatus || i.approvalStatus || 'not_submitted',
      'Insurance Expiry Date': fmtDate(i.approvalValidTo),
      'Plan Type': i.planType || '',
      'IPA / Medical Group': i.ipaMedicalGroup || '',
      'PCP Name': i.pcpName || '',
      'Dialysis Coverage': i.dialysisCoverage || '',
      'Authorization Required': i.authorizationRequired ? 'true' : 'false',
      'Transportation Benefits': i.transportationBenefits || '',
      Deductible: i.deductible || '',
      Coinsurance: i.coinsurance || '',
      'OOP Max': i.oopMax || '',
      'Care Coordination Flags': (i.careCoordinationFlags || []).join(', '),
      'Source File': i.sourceFile || '',
      Status: p.status || 'active',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="patients-export-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buffer);
});

/**
 * POST /api/v1/patients/:idOrMrn/recurring/start   { chair? }
 * Turns on recurring booking and generates the coming schedules.
 */
export const startRecurring = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne(getPatientQuery(req.params.idOrMrn));
  if (!patient) throw new ApiError(404, 'Patient not found');
  if (!patient.dayPattern || ![1, 2, 3].includes(Number(patient.shift))) {
    throw new ApiError(400, 'Set the patient\'s dialysis days (MWF/TTS) and shift before starting recurring schedules.');
  }

  patient.recurring = {
    ...(patient.recurring || {}),
    active: true,
    chair: req.body?.chair || patient.recurring?.chair,
    startedAt: new Date(),
    startedByName: req.user?.name,
    stoppedAt: undefined,
    stoppedByName: undefined,
  };
  await patient.save();

  let created = 0;
  try { created = await generateRecurringForPatient(patient._id, { bookedBy: req.user?._id }); } catch (e) { /* non-fatal */ }

  await writeAudit({ user: req.user, action: 'patient.recurring.start', entity: 'Patient', entityId: patient._id });
  return sendSuccess(res, { message: `Recurring schedule started (${created} session(s) booked)`, data: { recurring: patient.recurring, created } });
});

/**
 * POST /api/v1/patients/:idOrMrn/recurring/stop   { removeFuture? }
 * Turns off recurring booking. When removeFuture is true, deletes this patient's
 * future recurring schedules that haven't started yet.
 */
export const stopRecurring = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne(getPatientQuery(req.params.idOrMrn));
  if (!patient) throw new ApiError(404, 'Patient not found');

  patient.recurring = {
    ...(patient.recurring || {}),
    active: false,
    stoppedAt: new Date(),
    stoppedByName: req.user?.name,
  };
  await patient.save();

  let removed = 0;
  if (req.body?.removeFuture) {
    const now = new Date();
    const futureSchedules = await Schedule.find({
      patient: patient._id,
      recurring: true,
      startAt: { $gt: now },
      status: { $in: ['Scheduled', 'scheduled'] },
    }).select('_id').lean();
    const schedIds = futureSchedules.map((s) => s._id);

    // Remove the matching not-yet-started sessions first, then the schedules.
    await DialysisSession.deleteMany({
      schedule: { $in: schedIds },
      status: { $in: ['scheduled', 'Scheduled'] },
    });
    const del = await Schedule.deleteMany({ _id: { $in: schedIds } });
    removed = del.deletedCount || 0;
  }

  await writeAudit({ user: req.user, action: 'patient.recurring.stop', entity: 'Patient', entityId: patient._id });
  return sendSuccess(res, { message: `Recurring schedule stopped${removed ? ` (${removed} future session(s) removed)` : ''}`, data: { recurring: patient.recurring, removed } });
});

/**
 * POST /api/v1/patients/cleanup-orphans  (admin)
 * One-time cleanup: removes schedules and dialysis sessions whose patient no
 * longer exists (left over from deletes before cascade delete was added).
 */
export const cleanupOrphans = asyncHandler(async (req, res) => {
  const patientIds = await Patient.find().select('_id').lean();
  const validIds = patientIds.map((p) => String(p._id));

  const [sessions, schedules] = await Promise.all([
    DialysisSession.find().select('_id patient').lean(),
    Schedule.find().select('_id patient').lean(),
  ]);

  const orphanSessionIds = sessions
    .filter((s) => !s.patient || !validIds.includes(String(s.patient)))
    .map((s) => s._id);
  const orphanScheduleIds = schedules
    .filter((s) => !s.patient || !validIds.includes(String(s.patient)))
    .map((s) => s._id);

  const [delSessions, delSchedules] = await Promise.all([
    orphanSessionIds.length ? DialysisSession.deleteMany({ _id: { $in: orphanSessionIds } }) : { deletedCount: 0 },
    orphanScheduleIds.length ? Schedule.deleteMany({ _id: { $in: orphanScheduleIds } }) : { deletedCount: 0 },
  ]);

  await writeAudit({ user: req.user, action: 'patient.cleanup_orphans', entity: 'Patient', entityId: null });

  return sendSuccess(res, {
    message: 'Orphaned records cleaned up',
    data: { sessions: delSessions.deletedCount || 0, schedules: delSchedules.deletedCount || 0 },
  });
});
