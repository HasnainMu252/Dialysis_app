import asyncHandler from 'express-async-handler';
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

  await writeAudit({ user: req.user, action: 'patient.create', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, { statusCode: 201, message: 'Patient created successfully', data: patient });
});

export const listPatients = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const skip = (page - 1) * limit;

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

  const [data, total] = await Promise.all([
    Patient.find(q).select(visiblePatientFields(req.user.role)).sort('-createdAt').skip(skip).limit(limit).lean({ virtuals: true }),
    Patient.countDocuments(q),
  ]);

  return sendSuccess(res, { data, meta: { count: data.length, total, page, pages: Math.ceil(total / limit) } });
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

  const result = await Patient.deleteMany(query);

  await writeAudit({ user: req.user, action: 'patient.bulk_delete', entity: 'Patient', entityId: null });

  return sendSuccess(res, { message: 'Patients deleted successfully', data: { deletedCount: result.deletedCount } });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndDelete(getPatientQuery(req.params.id)).select('mrn firstName lastName');

  if (!patient) throw new ApiError(404, 'Patient not found');

  await writeAudit({ user: req.user, action: 'patient.delete', entity: 'Patient', entityId: patient._id });

  return sendSuccess(res, {
    message: 'Patient deleted successfully',
    data: { id: patient._id, mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
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
