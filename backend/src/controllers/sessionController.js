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

  let data = await DialysisSession.find(filter)
    .populate('patient chair schedule checkedInBy startedBy completedBy')
    .sort('-createdAt');

  // App-wide schedule expiry: a session that is still 'scheduled' but whose
  // schedule end time has passed (patient never checked in) is treated as
  // expired and hidden from the treatment/workflow list. The underlying
  // schedule still appears in the Schedule list (flagged "Expired").
  // Pass ?includeExpired=1 to opt out of this filtering.
  if (!req.query.includeExpired) {
    const now = new Date();
    data = data.filter((s) => {
      if (s.status !== 'scheduled') return true;
      const endAt = s.schedule?.endAt;
      return !(endAt && new Date(endAt) < now);
    });
  }

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
  const session = await DialysisSession.findById(req.params.id).populate('schedule', 'bufferMinutes');

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

  // Chair enters a cleaning/buffer window after dialysis. It auto-returns to
  // 'available' once the buffer (schedule.bufferMinutes, default 30) elapses —
  // enforced lazily on the next chair listing (see listChairs).
  const bufferMin = Number(session.schedule?.bufferMinutes) || 30;
  await Chair.findByIdAndUpdate(session.chair, {
    status: 'cleaning',
    currentSession: null,
    cleaningUntil: new Date(Date.now() + bufferMin * 60 * 1000),
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

/**
 * POST /api/v1/sessions/:id/technician-notes
 * Add a technician observation during dialysis (e.g. access type = Fistula + comment).
 * This is the technician's write surface — they have NO medication access.
 * Nurses / doctors / admins may also add notes.
 * body: { accessType, comment }
 */
export const addTechnicianNote = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found');

  const { accessType = '', comment = '' } = req.body || {};
  if (!String(comment).trim() && !String(accessType).trim()) {
    throw new ApiError(400, 'Provide an access type or a comment');
  }

  session.technicianNotes.push({
    accessType,
    accessOther: req.body?.accessOther || '',
    comment: String(comment).trim(),
    author: req.user?._id,
    authorName: req.user?.name,
    authorRole: req.user?.role,
    createdAt: new Date(),
  });

  await session.save();

  await writeAudit({
    user: req.user,
    action: 'session.technicianNote.add',
    entity: 'DialysisSession',
    entityId: session._id,
  });

  res.status(201).json({
    success: true,
    message: 'Note added',
    data: session.technicianNotes,
  });
});

/**
 * DELETE /api/v1/sessions/:id/technician-notes/:noteId
 * Remove a technician note (author's own role set, or admin).
 */
export const deleteTechnicianNote = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found');

  const note = session.technicianNotes.id(req.params.noteId);
  if (!note) throw new ApiError(404, 'Note not found');

  note.deleteOne();
  await session.save();

  res.json({ success: true, message: 'Note removed', data: session.technicianNotes });
});
