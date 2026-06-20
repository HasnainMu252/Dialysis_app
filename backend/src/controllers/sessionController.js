import asyncHandler from 'express-async-handler';
import DialysisSession from '../models/DialysisSession.js';
import QueueEntry from '../models/QueueEntry.js';
import Chair from '../models/Chair.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

export const listSessions = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.patient) filter.patient = req.query.patient;
  if (req.query.schedule) filter.schedule = req.query.schedule;
  if (req.query.chair) filter.chair = req.query.chair;

  const data = await DialysisSession.find(filter)
    .populate('patient chair schedule checkedInBy startedBy completedBy')
    .sort('-createdAt');

  res.json({
    success: true,
    count: data.length,
    data,
  });
});

export const checkIn = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (!['scheduled', 'ready'].includes(session.status)) {
    throw new ApiError(400, `Cannot check-in session with status ${session.status}`);
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await QueueEntry.countDocuments({
    scheduledDate: { $gte: startOfDay },
  });

  session.status = 'checked_in';
  session.checkedInAt = new Date();
  session.checkedInBy = req.user?._id;
  session.queueNumber = count + 1;

  await session.save();

  await QueueEntry.findOneAndUpdate(
    { session: session._id },
    {
      session: session._id,
      patient: session.patient,
      scheduledDate: new Date(),
      position: count + 1,
      status: 'waiting',
    },
    { upsert: true, new: true }
  );

  await writeAudit({
    user: req.user,
    action: 'session.check_in',
    entity: 'DialysisSession',
    entityId: session._id,
  });

  res.json({
    success: true,
    message: 'Patient checked in successfully',
    data: session,
  });
});

export const startSession = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (!['checked_in', 'ready'].includes(session.status)) {
    throw new ApiError(400, `Cannot start session with status ${session.status}`);
  }

  session.status = 'in_progress';
  session.startedAt = new Date();
  session.startedBy = req.user?._id;

  await session.save();

  await Chair.findByIdAndUpdate(session.chair, {
    status: 'in_use',
    currentSession: session._id,
  });

  await QueueEntry.findOneAndUpdate(
    { session: session._id },
    { status: 'in_treatment' }
  );

  await writeAudit({
    user: req.user,
    action: 'session.start',
    entity: 'DialysisSession',
    entityId: session._id,
  });

  res.json({
    success: true,
    message: 'Dialysis session started',
    data: session,
  });
});

export const addVitals = asyncHandler(async (req, res) => {
  const data = await DialysisSession.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        vitals: {
          ...req.body,
          recordedBy: req.user?._id,
        },
      },
    },
    { new: true, runValidators: true }
  );

  if (!data) {
    throw new ApiError(404, 'Session not found');
  }

  res.json({
    success: true,
    data,
  });
});

export const addSoap = asyncHandler(async (req, res) => {
  const data = await DialysisSession.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        soapNotes: {
          ...req.body,
          author: req.user?._id,
        },
      },
    },
    { new: true, runValidators: true }
  );

  if (!data) {
    throw new ApiError(404, 'Session not found');
  }

  res.json({
    success: true,
    data,
  });
});

export const completeSession = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (session.status !== 'in_progress') {
    throw new ApiError(400, 'Only in-progress sessions can be completed');
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.completedBy = req.user?._id;
  session.treatmentSummary = req.body.treatmentSummary;
  session.sentToBillerAt = new Date();

  await session.save();

  await Chair.findByIdAndUpdate(session.chair, {
    status: 'cleaning',
    currentSession: null,
  });

  await QueueEntry.findOneAndUpdate(
    { session: session._id },
    { status: 'completed' }
  );

  await writeAudit({
    user: req.user,
    action: 'session.complete',
    entity: 'DialysisSession',
    entityId: session._id,
  });

  res.json({
    success: true,
    message: 'Session completed and saved in treatment history',
    data: session,
  });
});
export const uploadSessionDocuments = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  const files = req.files || [];
  if (!files.length) {
    throw new ApiError(400, 'No files uploaded');
  }

  const docs = files.map((file) => ({
    name: req.body.name || file.originalname,
    fileUrl: `/uploads/session-documents/${file.filename}`,
    mimeType: file.mimetype,
    notes: req.body.notes || '',
    uploadedBy: req.user?._id,
    uploadedAt: new Date(),
  }));

  session.documents.push(...docs);
  await session.save();

  res.status(201).json({
    success: true,
    message: `${docs.length} document(s) uploaded`,
    data: session.documents,
  });
});
