import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import BillingClaim from '../models/BillingClaim.js';

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
  const claims = await BillingClaim.find()
    .populate('patient session')
    .sort('-createdAt');

  res.json({
    success: true,
    data: claims,
  });
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