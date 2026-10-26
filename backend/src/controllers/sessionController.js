import asyncHandler from 'express-async-handler';
import { notifyStationStatus } from '../services/notificationService.js';
import DialysisSession from '../models/DialysisSession.js';
import QueueEntry from '../models/QueueEntry.js';
import Chair from '../models/Chair.js';
import Patient from '../models/Patient.js';
import { createClaimForSession } from '../services/billingAutoService.js';
import { ApiError } from '../utils/apiError.js';
import { buildSessionCode, slotFor } from '../utils/sessionCode.js';
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

  // Skip orphaned sessions whose patient no longer exists (deleted patient).
  // These would otherwise render as "Unknown patient" in the treatment flow.
  data = data.filter((s) => s.patient);

  // App-wide schedule expiry: a session still 'scheduled' whose schedule ended on
  // a PREVIOUS day (patient never checked in) is hidden from the treatment flow.
  // Today's schedules stay visible all day even after their time slot passes, so
  // the morning shift doesn't disappear in the afternoon. The underlying schedule
  // still appears in the Schedule list (flagged "Expired").
  // Pass ?includeExpired=1 to opt out of this filtering.
  if (!req.query.includeExpired) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    data = data.filter((s) => {
      if (s.status !== 'scheduled') return true;
      const endAt = s.schedule?.endAt;
      return !(endAt && new Date(endAt) < startOfToday);
    });
  }

  // Sessions embed the populated schedule directly (they don't pass through
  // formatSchedule), so normalise the session code here too. This rebuilds
  // codes that are missing or in the old format (slot 0 / 8-digit date).
  const normalised = data.map((s) => {
    const obj = s.toObject ? s.toObject() : s;
    const sched = obj.schedule;
    if (sched && typeof sched === 'object') {
      const resolvedShift = sched.shift ?? slotFor(sched.startTime) ?? null;
      const stale =
        !sched.sessionCode ||
        /-0-/.test(sched.sessionCode) ||
        /-\d{8}$/.test(sched.sessionCode);
      sched.shift = resolvedShift;
      if (stale) {
        sched.sessionCode = buildSessionCode({
          chairDoc: obj.chair,
          chairCode: sched.chairCode,
          startTime: sched.startTime,
          date: sched.date,
          shift: resolvedShift,
        });
      }
    }
    return obj;
  });

  res.json({
    success: true,
    count: normalised.length,
    data: normalised,
  });
});

/** GET /sessions/:id — single session with full populate (billing drill-down). */
export const getSession = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id)
    .populate('patient chair schedule checkedInBy startedBy completedBy');
  if (!session) throw new ApiError(404, 'Session not found');
  res.json({ success: true, data: session });
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

/**
 * PATCH /sessions/:id/flow-sheet
 * Technician/nurse flow sheet: machine checks, solution mixing, access list,
 * access assessment. Upserts the single embedded flowSheet object.
 */
export const updateFlowSheet = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found');

  const fs = session.flowSheet || {};
  const { machineCheck, solutionMixing, accessList, accessAssessment, accessEvaluation } = req.body || {};

  session.flowSheet = {
    machineCheck: machineCheck ?? fs.machineCheck ?? {},
    solutionMixing: solutionMixing ?? fs.solutionMixing ?? {},
    accessList: Array.isArray(accessList) ? accessList : fs.accessList || [],
    accessAssessment: accessAssessment ?? fs.accessAssessment ?? {},
    accessEvaluation: accessEvaluation ?? fs.accessEvaluation ?? {},
    updatedBy: req.user?._id,
    updatedByName: req.user?.name,
    updatedByRole: req.user?.role,
    updatedAt: new Date(),
  };

  await session.save();

  // Sync the flow-sheet access into the patient's single vascular-access record,
  // so what's entered on the flow sheet shows in the patient bio and to every
  // role. Access type comes from the structured evaluation or the first access
  // line; placement/site from the access line; last-maintained = now.
  const EVAL_TO_ACCESS = { av_fistula: 'Fistula', av_graft: 'AV Graft', permacath: 'Tunnel catheter' };
  const line = (session.flowSheet.accessList || [])[0] || {};
  const evalType = session.flowSheet.accessEvaluation?.type;
  const resolvedType = EVAL_TO_ACCESS[evalType] || (line.type ? String(line.type).trim() : '');
  if (session.patient && resolvedType) {
    const set = {
      'vascularAccess.accessType': resolvedType,
      'vascularAccess.lastAssessmentDate': new Date(),
      'vascularAccess.updatedBy': req.user?._id,
      'vascularAccess.updatedByName': req.user?.name,
      'vascularAccess.updatedAt': new Date(),
    };
    if (line.site) set['vascularAccess.location'] = line.site;
    if (line.placementDate) set['vascularAccess.placementDate'] = line.placementDate;
    await Patient.findByIdAndUpdate(session.patient, { $set: set });
  }

  await writeAudit({ user: req.user, action: 'session.flow_sheet.update', entity: 'DialysisSession', entityId: session._id });

  const data = await DialysisSession.findById(session._id)
    .populate('patient chair schedule checkedInBy startedBy completedBy');

  res.json({ success: true, data });
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

/**
 * PATCH /api/v1/sessions/:id/complete
 *
 * Role-aware completion:
 *  - TECHNICIAN -> submits for nurse review. Status becomes 'pending_review';
 *    the session is NOT closed and the station is not released yet.
 *  - NURSE / ADMIN -> closes the session directly (from in_progress) or
 *    finalises a technician submission (from pending_review) via
 *    finalizeSession below.
 */
export const completeSession = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id).populate('schedule', 'bufferMinutes');

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (session.status !== 'in_progress') {
    throw new ApiError(400, 'Only in-progress sessions can be completed');
  }

  // Technicians cannot close a session — it goes to the nurse for sign-off.
  if (req.user?.role === 'technician') {
    session.status = 'pending_review';
    session.submittedForReviewAt = new Date();
    session.submittedForReviewBy = req.user._id;
    session.submittedForReviewByName = req.user.name;
    session.submittedForReviewByRole = req.user.role;
    session.submissionNotes = req.body.treatmentSummary || '';
    if (req.body.treatmentSummary) session.treatmentSummary = req.body.treatmentSummary;

    await session.save();

    await writeAudit({
      user: req.user,
      action: 'session.submitForReview',
      entity: 'DialysisSession',
      entityId: session._id,
    });

    return res.json({
      success: true,
      message: 'Submitted for nurse review',
      data: session,
    });
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
  const cleaningChair = await Chair.findByIdAndUpdate(session.chair, {
    status: 'cleaning',
    currentSession: null,
    cleaningUntil: new Date(Date.now() + bufferMin * 60 * 1000),
  });
  notifyStationStatus({
    stationCode: cleaningChair?.code || cleaningChair?.chairNumber || 'station',
    status: 'cleaning',
    patientName: session.patient?.firstName ? `${session.patient.firstName} ${session.patient.lastName || ''}`.trim() : undefined,
  });

  await QueueEntry.findOneAndUpdate(
    { session: session._id },
    { status: 'completed' }
  );

  // Dialysis done → bill immediately (procedure + drugs + IVs + radiology).
  try { await createClaimForSession(session._id); } catch (e) { /* non-fatal */ }

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

  // Access recorded on the flow sheet updates the patient's single access
  // record (type + last-maintained date), so the bio stays the source of truth.
  const trimmedAccess = String(accessType).trim();
  if (session.patient && trimmedAccess && trimmedAccess !== 'Not applicable') {
    const resolved = trimmedAccess === 'Other'
      ? (String(req.body?.accessOther || '').trim() || 'Other')
      : trimmedAccess;
    await Patient.findByIdAndUpdate(session.patient, {
      $set: {
        'vascularAccess.accessType': resolved,
        'vascularAccess.lastAssessmentDate': new Date(),
        'vascularAccess.updatedBy': req.user?._id,
        'vascularAccess.updatedByName': req.user?.name,
        'vascularAccess.updatedAt': new Date(),
      },
    });
  }

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

/**
 * PATCH /api/v1/sessions/:id/finalize
 * Nurse (or admin) reviews a technician-submitted session and closes it with a
 * digital signature. This is the authoritative close: it sets 'completed',
 * releases the station into its cleaning/buffer window and sends to billing.
 *
 * body: { signatureName, attested, reviewNotes, treatmentSummary }
 */
export const finalizeSession = asyncHandler(async (req, res) => {
  const session = await DialysisSession.findById(req.params.id).populate('schedule', 'bufferMinutes');
  if (!session) throw new ApiError(404, 'Session not found');

  if (session.status !== 'pending_review') {
    throw new ApiError(400, 'Only sessions pending review can be finalised');
  }

  const signatureName = String(req.body?.signatureName || '').trim();
  if (!signatureName) {
    throw new ApiError(400, 'A digital signature (your full name) is required to close this session');
  }
  if (req.body?.attested === false) {
    throw new ApiError(400, 'You must attest that the record has been reviewed');
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.completedBy = req.user?._id;
  if (req.body?.treatmentSummary) session.treatmentSummary = req.body.treatmentSummary;
  session.sentToBillerAt = new Date();
  session.nurseReview = {
    reviewedBy: req.user?._id,
    reviewedByName: req.user?.name,
    reviewedByRole: req.user?.role,
    reviewedAt: new Date(),
    signatureName,
    attested: true,
    reviewNotes: req.body?.reviewNotes || '',
  };

  await session.save();

  // Station enters its cleaning/buffer window only once the nurse has closed.
  const bufferMin = Number(session.schedule?.bufferMinutes) || 30;
  const finalizedChair = await Chair.findByIdAndUpdate(session.chair, {
    status: 'cleaning',
    currentSession: null,
    cleaningUntil: new Date(Date.now() + bufferMin * 60 * 1000),
  });
  notifyStationStatus({
    stationCode: finalizedChair?.code || finalizedChair?.chairNumber || 'station',
    status: 'cleaning',
  });

  await QueueEntry.findOneAndUpdate(
    { session: session._id },
    { status: 'completed' }
  );

  // Dialysis done → bill immediately.
  try { await createClaimForSession(session._id); } catch (e) { /* non-fatal */ }

  await writeAudit({
    user: req.user,
    action: 'session.finalize',
    entity: 'DialysisSession',
    entityId: session._id,
  });

  res.json({
    success: true,
    message: 'Session reviewed and closed',
    data: session,
  });
});
