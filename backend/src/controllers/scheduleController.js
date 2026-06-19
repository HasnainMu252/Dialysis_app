// controllers/scheduleController.js

import asyncHandler from 'express-async-handler';
import Schedule from '../models/Schedule.js';
import Patient from '../models/Patient.js';
import Chair from '../models/Chair.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';
import {
  DATE_RE,
  TIME_RE,
  buildDateOnlyUtc,
  buildUtcDateTime,
  validateDateTimeInput,
  assertScheduleAvailable,
  createSession,
  ACTIVE_SCHEDULE_STATUSES,
} from '../services/schedulingService.js';

const formatSchedule = (doc) => {
  if (!doc) return null;
  const s = doc.toJSON ? doc.toJSON() : doc;

  const patientName =
    s.patient && (s.patient.firstName || s.patient.lastName)
      ? `${s.patient.firstName || ''} ${s.patient.lastName || ''}`.trim()
      : undefined;

  return {
    id: s._id,
    code: s.code,
    patientMrn: s.patientMrn,
    patientName,
    patientPhone: s.patient?.phone,
    chair: {
      id: s.chair?._id,
      code: s.chairCode,
      name: s.chair?.name || s.chair?.chairNumber,
      type: s.chair?.type,
      status: s.chair?.status,
      location: s.chair?.location,
    },
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    durationHours: s.durationHours,
    bufferMinutes: s.bufferMinutes,
    status: s.status,
    notes: s.notes,
    createdAt: s.createdAt,
  };
};

const findChairByCode = async (chairCode) => {
  return Chair.findOne({
    $or: [{ code: chairCode }, { chairNumber: chairCode }],
  });
};

export const createSchedule = asyncHandler(async (req, res) => {
  const {
    patientMrn,
    chairCode,
    date,
    startTime,
    endTime,
    status,
    notes,
    bufferMinutes,
  } = req.body;

  if (!patientMrn || !chairCode || !date || !startTime || !endTime) {
    throw new ApiError(
      400,
      'Missing required fields: patientMrn, chairCode, date, startTime, endTime'
    );
  }

  validateDateTimeInput({ date, startTime, endTime });

  const dateOnlyUTC = buildDateOnlyUtc(date);
  const startAt = buildUtcDateTime(date, startTime);
  const endAt = buildUtcDateTime(date, endTime);

  if (startAt < new Date()) {
    throw new ApiError(400, 'Cannot create schedule in the past.');
  }

  const patient = await Patient.findOne({ mrn: patientMrn });
  if (!patient) {
    throw new ApiError(404, 'Patient not found with the provided MRN');
  }

  const chairDoc = await findChairByCode(chairCode);
  if (!chairDoc) {
    throw new ApiError(404, 'Chair not found for the provided chairCode');
  }

  if (!chairDoc.isActive) {
    throw new ApiError(400, `Chair ${chairDoc.name || chairDoc.chairNumber} is inactive`);
  }

  if (['maintenance', 'out_of_order'].includes(chairDoc.status)) {
    throw new ApiError(
      400,
      `Chair ${chairDoc.name || chairDoc.chairNumber} is not available for scheduling`
    );
  }

  if (chairDoc.maintenanceUntil && chairDoc.maintenanceUntil > startAt) {
    throw new ApiError(
      400,
      `Chair ${chairDoc.name || chairDoc.chairNumber} is under maintenance until ${chairDoc.maintenanceUntil.toISOString()}`
    );
  }

  await assertScheduleAvailable({
    chair: chairDoc._id,
    startAt,
    endAt,
    bufferMinutes: bufferMinutes ?? 30,
  });

  const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);

  const schedule = await Schedule.create({
    patientMrn,
    patient: patient._id,
    chairCode: chairDoc.code || chairDoc.chairNumber || chairCode,
    chair: chairDoc._id,
    date: dateOnlyUTC,
    startTime,
    endTime,
    startAt,
    endAt,
    durationHours,
    bufferMinutes: bufferMinutes ?? 30,
    state: 'Scheduled',
    status: status || 'Scheduled',
    notes,
    createdBy: req.user?._id,
  });

  const session = await createSession(schedule);

  const populatedSchedule = await Schedule.findById(schedule._id)
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    });

  await writeAudit({
    user: req.user,
    action: 'schedule.create',
    entity: 'Schedule',
    entityId: schedule._id,
  });

  res.status(201).json({
    success: true,
    message: '✅ Schedule created successfully.',
    schedule: formatSchedule(populatedSchedule),
    session,
  });
});

export const listSchedules = asyncHandler(async (req, res) => {
  const { patientMrn, date, status, chair, chairCode } = req.query;
  const filter = {};

  if (patientMrn) filter.patientMrn = patientMrn;
  if (status) filter.status = status;

  if (date) {
    if (!DATE_RE.test(date)) {
      throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
    }
    filter.date = buildDateOnlyUtc(date);
  }

  if (chair) {
    filter.chair = chair;
  } else if (chairCode) {
    const chairDoc = await findChairByCode(chairCode);

    if (!chairDoc) {
      return res.json({
        success: true,
        count: 0,
        schedules: [],
      });
    }

    filter.chair = chairDoc._id;
  }

  const schedules = await Schedule.find(filter)
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    })
    .sort({ date: 1, startTime: 1 });

  res.json({
    success: true,
    count: schedules.length,
    schedules: schedules.map(formatSchedule),
  });
});

export const getTodaySchedules = asyncHandler(async (req, res) => {
  const now = new Date();

  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );

  const endOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)
  );

  const schedules = await Schedule.find({
    startAt: {
      $gte: startOfDayUTC,
      $lte: endOfDayUTC,
    },
  })
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    })
    .sort({ startTime: 1 });

  res.json({
    success: true,
    date: startOfDayUTC.toISOString().split('T')[0],
    count: schedules.length,
    schedules: schedules.map(formatSchedule),
  });
});

export const getUpcomingSchedules = asyncHandler(async (req, res) => {
  const now = new Date();

  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );

  const schedules = await Schedule.find({
    date: { $gte: todayUTC },
    status: { $in: ACTIVE_SCHEDULE_STATUSES },
  })
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    })
    .sort({ date: 1, startTime: 1 })
    .limit(50);

  res.json({
    success: true,
    count: schedules.length,
    schedules: schedules.map(formatSchedule),
  });
});

export const getSchedulesByPatientMrn = asyncHandler(async (req, res) => {
  const { mrn } = req.params;

  const patient = await Patient.findOne({ mrn });
  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }

  const schedules = await Schedule.find({ patientMrn: mrn })
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    })
    .sort({ date: -1, startTime: 1 });

  res.json({
    success: true,
    patient: {
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
    },
    count: schedules.length,
    schedules: schedules.map(formatSchedule),
  });
});

export const getSchedule = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const schedule = await Schedule.findOne({ code })
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  res.json({
    success: true,
    schedule: formatSchedule(schedule),
  });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const current = await Schedule.findOne({ code });
  if (!current) {
    throw new ApiError(404, 'Schedule not found');
  }

  const updates = { ...req.body };

  if (updates.date && !DATE_RE.test(updates.date)) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  if (updates.startTime && !TIME_RE.test(updates.startTime)) {
    throw new ApiError(400, 'Invalid startTime format. Use HH:MM');
  }

  if (updates.endTime && !TIME_RE.test(updates.endTime)) {
    throw new ApiError(400, 'Invalid endTime format. Use HH:MM');
  }

  const nextDate = updates.date || current.date.toISOString().split('T')[0];
  const nextStartTime = updates.startTime || current.startTime;
  const nextEndTime = updates.endTime || current.endTime;

  if (
    updates.date ||
    updates.startTime ||
    updates.endTime ||
    updates.chairCode ||
    updates.chair ||
    updates.bufferMinutes
  ) {
    validateDateTimeInput({
      date: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
    });

    updates.date = buildDateOnlyUtc(nextDate);
    updates.startAt = buildUtcDateTime(nextDate, nextStartTime);
    updates.endAt = buildUtcDateTime(nextDate, nextEndTime);
    updates.durationHours =
      (updates.endAt.getTime() - updates.startAt.getTime()) / (1000 * 60 * 60);

    let chairId = updates.chair || current.chair;

    if (updates.chairCode) {
      const chairDoc = await findChairByCode(updates.chairCode);

      if (!chairDoc) {
        throw new ApiError(404, 'Chair not found for the provided chairCode');
      }

      if (!chairDoc.isActive) {
        throw new ApiError(400, 'Chair is inactive');
      }

      if (['maintenance', 'out_of_order'].includes(chairDoc.status)) {
        throw new ApiError(400, 'Chair is not available for scheduling');
      }

      chairId = chairDoc._id;
      updates.chair = chairDoc._id;
      updates.chairCode = chairDoc.code || chairDoc.chairNumber || updates.chairCode;
    }

    await assertScheduleAvailable({
      chair: chairId,
      startAt: updates.startAt,
      endAt: updates.endAt,
      bufferMinutes: updates.bufferMinutes ?? current.bufferMinutes ?? 30,
      excludeScheduleId: current._id,
    });
  }

  if (updates.patientMrn) {
    const patient = await Patient.findOne({ mrn: updates.patientMrn });

    if (!patient) {
      throw new ApiError(404, 'Patient not found with the provided MRN');
    }

    updates.patient = patient._id;
  }

  const schedule = await Schedule.findOneAndUpdate({ code }, updates, {
    new: true,
    runValidators: true,
  })
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    });

  await writeAudit({
    user: req.user,
    action: 'schedule.update',
    entity: 'Schedule',
    entityId: schedule._id,
  });

  res.json({
    success: true,
    message: '✅ Schedule updated.',
    schedule: formatSchedule(schedule),
  });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const schedule = await Schedule.findOneAndDelete({ code });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  if (schedule.chair) {
    await Chair.findByIdAndUpdate(schedule.chair, {
      status: 'available',
      currentSession: null,
    });
  }

  await writeAudit({
    user: req.user,
    action: 'schedule.delete',
    entity: 'Schedule',
    entityId: schedule._id,
  });

  res.json({
    success: true,
    message: 'Schedule deleted successfully',
  });
});

export const deleteAllSchedules = asyncHandler(async (req, res) => {
  if (req.query.confirm !== 'true') {
    throw new ApiError(
      400,
      'Dangerous operation blocked. Add ?confirm=true to delete ALL schedules.'
    );
  }

  const result = await Schedule.deleteMany({});

  await Chair.updateMany(
    {},
    {
      status: 'available',
      currentSession: null,
    }
  );

  res.json({
    success: true,
    message: '🗑️ All schedule records deleted successfully.',
    deletedCount: result.deletedCount,
  });
});

export const requestCancel = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { reason } = req.body || {};

  const schedule = await Schedule.findOneAndUpdate(
    { code },
    {
      status: 'Cancelled',
      state: 'Cancelled',
      'cancel.requested': true,
      'cancel.reason': reason || 'No reason provided',
    },
    { new: true }
  )
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  res.json({
    success: true,
    message: 'Cancellation requested',
    schedule: formatSchedule(schedule),
  });
});

export const approveCancel = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const schedule = await Schedule.findOneAndUpdate(
    { code },
    {
      status: 'Cancelled',
      state: 'Cancelled',
      'cancel.approved': true,
    },
    { new: true }
  )
    .populate({
      path: 'patient',
      select: 'firstName lastName mrn phone email',
      strictPopulate: false,
    })
    .populate({
      path: 'chair',
      select: 'code chairNumber name status type location',
      strictPopulate: false,
    });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  res.json({
    success: true,
    message: 'Cancellation approved',
    schedule: formatSchedule(schedule),
  });
});

export const availability = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, bufferMinutes } = req.query;

  if (!date || !DATE_RE.test(date)) {
    throw new ApiError(400, 'Valid date is required. Use YYYY-MM-DD');
  }

  const dayStart = buildDateOnlyUtc(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const chairs = await Chair.find({
    isActive: true,
    status: {
      $nin: ['out_of_order', 'cleaning', 'in_use', 'maintenance'],
    },
  }).lean();

  if (startTime && endTime) {
    validateDateTimeInput({ date, startTime, endTime });

    const startAt = buildUtcDateTime(date, startTime);
    const endAt = buildUtcDateTime(date, endTime);

    const results = await Promise.all(
      chairs.map(async (chair) => {
        try {
          await assertScheduleAvailable({
            chair: chair._id,
            startAt,
            endAt,
            bufferMinutes: bufferMinutes ? Number(bufferMinutes) : 30,
          });

          return {
            code: chair.code || chair.chairNumber,
            chairNumber: chair.chairNumber,
            name: chair.name || chair.chairNumber,
            type: chair.type,
            status: chair.status,
            location: chair.location,
          };
        } catch {
          return null;
        }
      })
    );

    return res.json({
      success: true,
      date,
      slot: { startTime, endTime },
      availableChairs: results.filter(Boolean),
    });
  }

  const booked = await Schedule.find({
    startAt: {
      $gte: dayStart,
      $lt: dayEnd,
    },
    status: { $in: ACTIVE_SCHEDULE_STATUSES },
  })
    .select('chair chairCode startTime endTime bufferMinutes status')
    .lean();

  const busyByChair = new Map();

  for (const item of booked) {
    const key = String(item.chair);
    if (!busyByChair.has(key)) busyByChair.set(key, []);

    busyByChair.get(key).push({
      chairCode: item.chairCode,
      startTime: item.startTime,
      endTime: item.endTime,
      bufferMinutes: item.bufferMinutes ?? 30,
      status: item.status,
    });
  }

  res.json({
    success: true,
    date,
    chairs: chairs.map((chair) => ({
      code: chair.code || chair.chairNumber,
      chairNumber: chair.chairNumber,
      name: chair.name || chair.chairNumber,
      type: chair.type,
      status: chair.status,
      location: chair.location,
      busy: busyByChair.get(String(chair._id)) || [],
    })),
  });
});

export const approveSchedule = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const schedule = await Schedule.findOne({ code });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  schedule.status = 'Scheduled';
  schedule.state = 'Scheduled';
  schedule.approval = schedule.approval || {};
  schedule.approval.approvedAt = new Date();
  schedule.approval.approvedBy = req.user?._id;

  await schedule.save();

  res.json({
    success: true,
    message: 'Schedule approved',
    schedule,
  });
});

export const rejectSchedule = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { reason } = req.body;

  const schedule = await Schedule.findOne({ code });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  schedule.status = 'Cancelled';
  schedule.state = 'Cancelled';
  schedule.approval = schedule.approval || {};
  schedule.approval.rejectedAt = new Date();
  schedule.approval.rejectedBy = req.user?._id;
  schedule.approval.reason = reason || 'Cancelled';

  await schedule.save();

  res.json({
    success: true,
    message: 'Schedule rejected',
    schedule,
  });
});