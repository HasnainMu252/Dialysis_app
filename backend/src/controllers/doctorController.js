import fs from 'fs';
import asyncHandler from 'express-async-handler';
import DoctorCheckup from '../models/DoctorCheckup.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';

export const getDoctorPatients = asyncHandler(async (_req, res) => {
  const patients = await Patient.find({ status: 'active' })
    .select(
      'mrn firstName lastName dob gender phone email address city state zip status insurance medicalHistory registration'
    )
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: patients.length,
    data: patients,
    message: 'Doctor patient list fetched successfully',
    errors: [],
  });
});

export const getDoctorPatientDetail = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.patientId)
    .select(
      'mrn firstName lastName dob gender phone email address city state zip referralSource hospital patientType homeFacility emergencyContact medicalHistory registration insurance status'
    )
    .lean();

  if (!patient) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Patient not found',
      errors: [],
    });
  }

  const checkups = await DoctorCheckup.find({ patient: patient._id })
    .populate('doctor', 'name email role')
    .populate('documents.uploadedBy', 'name email role')
    .sort({ year: -1, month: -1, roundNumber: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      patient,
      doctorCheckups: checkups,
    },
    message: 'Doctor patient detail fetched successfully',
    errors: [],
  });
});

export const createDoctorCheckup = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findById(patientId).select('mrn firstName lastName');

  if (!patient) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Patient not found',
      errors: [],
    });
  }

  const now = new Date();

  const {
    month = now.getMonth() + 1,
    year = now.getFullYear(),
    roundNumber,
    checkupDate,
    vitals,
    soap,
    nextFollowUpDate,
    status = 'completed',
    physicianRound = {},
    doctorComments = '',
    socialWorkerComments = '',
    dietitianComments = '',
    cqi = {},
    templateUsed = '',
  } = req.body;

  if (!roundNumber || ![1, 2, 3, 4].includes(Number(roundNumber))) {
    return res.status(400).json({
      success: false,
      data: {},
      message: 'roundNumber is required and must be 1, 2, 3, or 4',
      errors: [],
    });
  }

  const existingRound = await DoctorCheckup.findOne({
    patient: patient._id,
    month: Number(month),
    year: Number(year),
    roundNumber: Number(roundNumber),
  });

  if (existingRound) {
    return res.status(409).json({
      success: false,
      data: existingRound,
      message: `Round ${roundNumber} already exists for this patient in ${month}/${year}`,
      errors: [],
    });
  }

  const checkup = await DoctorCheckup.create({
    patient: patient._id,
    patientMrn: patient.mrn,
    doctor: req.user._id,
    month: Number(month),
    year: Number(year),
    roundNumber: Number(roundNumber),
    checkupDate,
    vitals,
    soap,
    nextFollowUpDate,
    status,
    physicianRound,
    doctorComments,
    socialWorkerComments,
    dietitianComments,
    cqi: {
      patient: cqi.patient || '',
      social: cqi.social || '',
      dietitian: cqi.dietitian || '',
    },
    templateUsed,
    approval: { status: 'pending', history: [] },
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: checkup,
    message: 'Doctor SOAP checkup saved successfully',
    errors: [],
  });
});

export const getPatientDoctorCheckups = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { month, year } = req.query;

  const filter = { patient: patientId };

  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const checkups = await DoctorCheckup.find(filter)
    .populate('doctor', 'name email role')
    .populate('documents.uploadedBy', 'name email role')
    .sort({ year: -1, month: -1, roundNumber: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: checkups.length,
    data: checkups,
    message: 'Doctor checkups fetched successfully',
    errors: [],
  });
});

export const updateDoctorCheckup = asyncHandler(async (req, res) => {
  const checkup = await DoctorCheckup.findById(req.params.id);

  if (!checkup) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Doctor checkup not found',
      errors: [],
    });
  }

  const allowedFields = [
    'checkupDate', 'vitals', 'soap', 'nextFollowUpDate', 'status',
    'physicianRound', 'doctorComments', 'socialWorkerComments',
    'dietitianComments', 'cqi', 'templateUsed',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      checkup[field] = req.body[field];
    }
  });

  checkup.updatedBy = req.user._id;
  await checkup.save();

  res.status(200).json({
    success: true,
    data: checkup,
    message: 'Doctor checkup updated successfully',
    errors: [],
  });
});

export const uploadDoctorCheckupDocuments = asyncHandler(async (req, res) => {
  const checkup = await DoctorCheckup.findById(req.params.id);

  if (!checkup) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Doctor checkup not found',
      errors: [],
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      data: {},
      message: 'At least one document is required',
      errors: [],
    });
  }

  const uploadedDocs = req.files.map((file) => ({
    name: req.body.name || file.originalname,
    originalName: file.originalname,
    url: `/uploads/doctor-checkups/${file.filename}`,
    filePath: file.path.replace(/\\/g, '/'),
    fileType: file.mimetype,
    size: file.size,
    uploadedBy: req.user._id,
    notes: req.body.notes || '',
  }));

  checkup.documents.push(...uploadedDocs);
  await checkup.save();

  res.status(200).json({
    success: true,
    count: uploadedDocs.length,
    data: checkup.documents,
    message: 'Doctor checkup documents uploaded successfully',
    errors: [],
  });
});

export const deleteDoctorCheckupDocument = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;

  const checkup = await DoctorCheckup.findById(id);

  if (!checkup) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Doctor checkup not found',
      errors: [],
    });
  }

  const document = checkup.documents.id(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Document not found',
      errors: [],
    });
  }

  if (document.filePath && fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }

  document.deleteOne();
  await checkup.save();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Document deleted successfully',
    errors: [],
  });
});

export const getMonthlyRoundStatus = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());

  const checkups = await DoctorCheckup.find({
    patient: req.params.patientId,
    month,
    year,
    status: 'completed',
  })
    .select('roundNumber checkupDate status')
    .lean();

  const completedRounds = checkups.map((item) => item.roundNumber);
  const missingRounds = [1, 2, 3, 4].filter(
    (round) => !completedRounds.includes(round)
  );

  res.status(200).json({
    success: true,
    data: {
      patient: req.params.patientId,
      month,
      year,
      completedCount: completedRounds.length,
      completedRounds,
      missingRounds,
      isComplete: completedRounds.length >= 4,
    },
    message: 'Monthly round status fetched successfully',
    errors: [],
  });
});

export const createMissingRoundNotifications = asyncHandler(async (_req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const patients = await Patient.find({ status: 'active' })
    .select('_id mrn firstName lastName')
    .lean();

  let created = 0;

  for (const patient of patients) {
    const completedCount = await DoctorCheckup.countDocuments({
      patient: patient._id,
      month,
      year,
      status: 'completed',
    });

    if (completedCount < 4) {
      await Notification.create({
        title: 'Missing Doctor SOAP Rounds',
        message: `${patient.firstName} ${patient.lastName} has only ${completedCount}/4 doctor checkups completed this month.`,
        type: 'general',
        priority: 'urgent',
        patient: patient._id,
        roles: ['doctor', 'admin'],
      });

      created += 1;
    }
  }

  res.status(201).json({
    success: true,
    data: { created },
    message: 'Missing doctor round notifications created',
    errors: [],
  });
});
/**
 * POST /api/v1/doctors/checkups/batch
 * Create the same monthly round for many selected patients at once.
 * body: { patientIds:[], month, year, roundNumber, ...roundData }
 */
export const batchCreateCheckups = asyncHandler(async (req, res) => {
  const now = new Date();
  const {
    patientIds = [],
    month = now.getMonth() + 1,
    year = now.getFullYear(),
    roundNumber,
    checkupDate,
    vitals,
    soap,
    physicianRound = {},
    doctorComments = '',
    socialWorkerComments = '',
    dietitianComments = '',
    cqi = {},
    templateUsed = '',
    status = 'completed',
  } = req.body;

  if (!Array.isArray(patientIds) || !patientIds.length) {
    res.status(400);
    throw new Error('Select at least one patient');
  }
  if (!roundNumber || ![1, 2, 3, 4].includes(Number(roundNumber))) {
    res.status(400);
    throw new Error('roundNumber must be 1, 2, 3 or 4');
  }

  const patients = await Patient.find({ _id: { $in: patientIds } }).select('mrn');
  const created = [];
  const skipped = [];

  for (const patient of patients) {
    const exists = await DoctorCheckup.findOne({
      patient: patient._id, month: Number(month), year: Number(year), roundNumber: Number(roundNumber),
    });
    if (exists) { skipped.push(patient.mrn); continue; }
    /* eslint-disable no-await-in-loop */
    const doc = await DoctorCheckup.create({
      patient: patient._id,
      patientMrn: patient.mrn,
      doctor: req.user._id,
      month: Number(month),
      year: Number(year),
      roundNumber: Number(roundNumber),
      checkupDate,
      vitals,
      soap,
      physicianRound,
      doctorComments,
      socialWorkerComments,
      dietitianComments,
      cqi: { patient: cqi.patient || '', social: cqi.social || '', dietitian: cqi.dietitian || '' },
      templateUsed,
      status,
      approval: { status: 'pending', history: [] },
      createdBy: req.user._id,
    });
    created.push(doc);
  }

  res.status(201).json({
    success: true,
    data: { createdCount: created.length, skipped, created },
    message: `Created ${created.length} round(s)${skipped.length ? `, skipped ${skipped.length} (already existed)` : ''}`,
    errors: [],
  });
});

/**
 * PATCH /api/v1/doctors/checkups/batch
 * Apply the same field updates to many existing rounds.
 * Only NON-EMPTY values are merged, so untouched fields are preserved
 * and round data actually updates instead of being wiped.
 * body: { ids:[], updates:{ ... } }
 */
export const batchUpdateCheckups = asyncHandler(async (req, res) => {
  const { ids = [], updates = {} } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    res.status(400);
    throw new Error('Select at least one round');
  }

  const isEmpty = (v) => v === '' || v === null || v === undefined || v === false;

  // merge only the non-empty leaf values from src into target
  const mergeNonEmpty = (target = {}, src = {}) => {
    const out = { ...target };
    Object.entries(src).forEach(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = mergeNonEmpty(out[k] || {}, v);
      } else if (!isEmpty(v)) {
        out[k] = v;
      }
    });
    return out;
  };

  const checkups = await DoctorCheckup.find({ _id: { $in: ids } });
  let modified = 0;

  for (const checkup of checkups) {
    if (updates.physicianRound) {
      checkup.physicianRound = mergeNonEmpty(checkup.physicianRound || {}, updates.physicianRound);
      checkup.markModified('physicianRound');
    }
    if (updates.cqi) {
      checkup.cqi = mergeNonEmpty(checkup.cqi?.toObject ? checkup.cqi.toObject() : checkup.cqi || {}, updates.cqi);
    }
    if (updates.vitals) checkup.vitals = mergeNonEmpty(checkup.vitals?.toObject ? checkup.vitals.toObject() : checkup.vitals || {}, updates.vitals);
    if (updates.soap) checkup.soap = mergeNonEmpty(checkup.soap?.toObject ? checkup.soap.toObject() : checkup.soap || {}, updates.soap);
    if (!isEmpty(updates.doctorComments)) checkup.doctorComments = updates.doctorComments;
    if (!isEmpty(updates.socialWorkerComments)) checkup.socialWorkerComments = updates.socialWorkerComments;
    if (!isEmpty(updates.dietitianComments)) checkup.dietitianComments = updates.dietitianComments;
    if (!isEmpty(updates.status)) checkup.status = updates.status;
    checkup.updatedBy = req.user._id;
    /* eslint-disable-next-line no-await-in-loop */
    await checkup.save();
    modified += 1;
  }

  res.json({
    success: true,
    data: { matched: checkups.length, modified },
    message: `Updated ${modified} round(s)`,
    errors: [],
  });
});

/**
 * GET /api/v1/doctors/checkups?month=&year=&roundNumber=&approval=
 * Flat list of rounds (for batch edit, physician billing, history).
 */
export const listAllCheckups = asyncHandler(async (req, res) => {
  const { month, year, roundNumber, approval } = req.query;
  const query = {};
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (roundNumber) query.roundNumber = Number(roundNumber);
  if (approval) query['approval.status'] = approval;

  const checkups = await DoctorCheckup.find(query)
    .populate('patient', 'mrn firstName lastName')
    .populate('doctor', 'name email')
    .sort({ year: -1, month: -1, roundNumber: 1 })
    .lean();

  res.json({ success: true, data: checkups, meta: { total: checkups.length }, message: 'Checkups fetched', errors: [] });
});

/**
 * PATCH /api/v1/doctors/checkups/:id/approval
 * Biller approval workflow: pending -> approved / rejected.
 */
export const updateCheckupApproval = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('status must be pending, approved or rejected');
  }

  const checkup = await DoctorCheckup.findById(req.params.id);
  if (!checkup) {
    res.status(404);
    throw new Error('Round not found');
  }

  checkup.approval = checkup.approval || {};
  checkup.approval.status = status;
  checkup.approval.reviewedBy = req.user._id;
  checkup.approval.reviewedAt = new Date();
  checkup.approval.history = checkup.approval.history || [];
  checkup.approval.history.push({ status, note, by: req.user._id, at: new Date() });
  await checkup.save();

  res.json({ success: true, data: checkup, message: `Round ${status}`, errors: [] });
});
