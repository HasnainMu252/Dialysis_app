import InsuranceForm from '../models/InsuranceForm.js';
import Patient from '../models/Patient.js';
import fs from 'fs';
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createInsuranceForm = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findById(patientId);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const existingForm = await InsuranceForm.findOne({
    patient: patient._id,
  });

  if (existingForm) {
    return res.status(400).json({
      success: false,
      message: 'Insurance form already exists for this patient. Please update existing form.',
    });
  }

  const form = await InsuranceForm.create({
    patient: patient._id,
    patientMrn: patient.mrn,
    clinicName: req.body.clinicName,
    admissionDate: req.body.admissionDate,

    formStatus: req.body.formStatus || 'draft',
    approvalStatus: req.body.approvalStatus || 'not_submitted',
    approvalReference: req.body.approvalReference,
    approvalValidFrom: req.body.approvalValidFrom,
    approvalValidTo: req.body.approvalValidTo,
    dueDate: req.body.dueDate,

    primaryInsurance: req.body.primaryInsurance,
    secondaryInsurance: req.body.secondaryInsurance,
    thirdInsurance: req.body.thirdInsurance,

    billingDeptApprovalSignature: req.body.billingDeptApprovalSignature,
    billingDeptApprovalDate: req.body.billingDeptApprovalDate,

    comments: req.body.comments,

    createdBy: req.user?._id,
  });

  res.status(201).json({
    success: true,
    message: 'Insurance form created successfully',
    data: form,
  });
});

export const getInsuranceFormByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const form = await InsuranceForm.findOne({
    patient: patientId,
  })
    .populate('patient', 'mrn firstName lastName dob gender phone email')
    .populate('comments.createdBy', 'name email role')
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



export const updateInsuranceForm = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const form = await InsuranceForm.findById(id);

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  const allowedFields = [
    'clinicName',
    'admissionDate',
    'formStatus',
    'approvalStatus',
    'approvalReference',
    'approvalValidFrom',
    'approvalValidTo',
    'dueDate',
    'rejectionReason',
    'primaryInsurance',
    'secondaryInsurance',
    'thirdInsurance',
    'billingDeptApprovalSignature',
    'billingDeptApprovalDate',
      'comments',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      form[field] = req.body[field];
    }
  });

  form.updatedBy = req.user?._id;

  if (req.body.dueDate) {
    form.sentExpiryNotification30Days = false;
  }

  await form.save();

  res.status(200).json({
    success: true,
    message: 'Insurance form updated successfully',
    data: form,
  });
});

export const deleteInsuranceDocument = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;

  const form = await InsuranceForm.findById(id);

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  const document = form.documents.id(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  if (document.filePath && fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }

  document.deleteOne();

  await form.save();

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
  });
});

export const deleteInsuranceForm = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const form = await InsuranceForm.findById(id);

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  for (const doc of form.documents) {
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
  }

  await InsuranceForm.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Insurance form deleted successfully',
  });
});

export const updateInsuranceDocument = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;

  const form = await InsuranceForm.findById(id);

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  const document = form.documents.id(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  if (req.body.name !== undefined) {
    document.name = req.body.name;
  }

  if (req.body.documentDate !== undefined) {
    document.documentDate = req.body.documentDate;
  }

  if (req.body.notes !== undefined) {
    document.notes = req.body.notes;
  }

  await form.save();

  res.status(200).json({
    success: true,
    message: 'Document updated successfully',
    data: document,
  });
});

export const uploadInsuranceDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const form = await InsuranceForm.findById(id);

  if (!form) {
    return res.status(404).json({
      success: false,
      message: 'Insurance form not found',
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one document is required',
    });
  }

  const documentDate = req.body.documentDate || new Date();
  const notes = req.body.notes || '';

const uploadedDocs = req.files.map((file) => ({
  name: req.body.name || file.originalname,
  originalName: file.originalname,
  url: `/uploads/insurance-documents/${file.filename}`, // ✅ already correct
  filePath: file.path.replace(/\\/g, '/'),              // ✅ normalize Windows backslashes
  fileType: file.mimetype,
  size: file.size,
  documentDate,
  uploadedBy: req.user?._id,
  notes,
}));

  form.documents.push(...uploadedDocs);

  await form.save();

  res.status(200).json({
    success: true,
    message: 'Documents uploaded successfully',
    count: uploadedDocs.length,
    data: form.documents,
  });
});

export const getExpiringInsuranceForms = asyncHandler(async (req, res) => {
  const today = new Date();

  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  const forms = await InsuranceForm.find({
    dueDate: {
      $gte: today,
      $lte: next30Days,
    },
    approvalStatus: {
      $in: ['approved', 'pending', 'submitted'],
    },
  }).populate('patient', 'mrn firstName lastName phone email');

  res.status(200).json({
    success: true,
    count: forms.length,
    data: forms,
  });
});