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

  const allowedFields = ['checkupDate', 'vitals', 'soap', 'nextFollowUpDate', 'status'];

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