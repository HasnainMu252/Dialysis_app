import Schedule from '../models/Schedule.js';
import DialysisSession from '../models/DialysisSession.js';
import { ApiError } from '../utils/apiError.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ACTIVE_SCHEDULE_STATUSES = [
  'Pending',
  'Scheduled',
  'CheckedIn',
  'InProgress',
];

export const DEFAULT_BUFFER_MINUTES = 30;

export const toMin = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const buildUtcDateTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
};

export const buildDateOnlyUtc = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
};

export const validateDateTimeInput = ({ date, startTime, endTime }) => {
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  if (!TIME_RE.test(startTime)) {
    throw new ApiError(400, 'Invalid startTime format. Use HH:MM');
  }

  if (!TIME_RE.test(endTime)) {
    throw new ApiError(400, 'Invalid endTime format. Use HH:MM');
  }

  if (toMin(startTime) >= toMin(endTime)) {
    throw new ApiError(400, 'startTime must be before endTime');
  }

  return true;
};

export const assertScheduleAvailable = async ({
  chair,
  nurse,
  startAt,
  endAt,
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
  excludeScheduleId,
}) => {
  if (!(startAt instanceof Date) || !(endAt instanceof Date) || !(startAt < endAt)) {
    throw new ApiError(400, 'startTime must be earlier than endTime.');
  }

  const idFilter = excludeScheduleId ? { _id: { $ne: excludeScheduleId } } : {};

  const requestBufferMs = Number(bufferMinutes ?? DEFAULT_BUFFER_MINUTES) * 60 * 1000;
  const SEARCH_PADDING_MS = 4 * 60 * 60 * 1000;

  const candidates = await Schedule.find({
    ...idFilter,
    chair,
    status: { $in: ACTIVE_SCHEDULE_STATUSES },
    startAt: { $lt: new Date(endAt.getTime() + SEARCH_PADDING_MS) },
    endAt: { $gt: new Date(startAt.getTime() - SEARCH_PADDING_MS) },
  })
    .select('code startTime endTime startAt endAt bufferMinutes')
    .lean();

  for (const existing of candidates) {
    const existingBufferMs =
      Number(existing.bufferMinutes ?? DEFAULT_BUFFER_MINUTES) * 60 * 1000;

    const gapMs = Math.max(requestBufferMs, existingBufferMs);

    const blockedStart = new Date(existing.startAt.getTime() - gapMs);
    const blockedEnd = new Date(existing.endAt.getTime() + gapMs);

    if (startAt < blockedEnd && endAt > blockedStart) {
      throw new ApiError(
        409,
        `Chair time conflict: requested slot overlaps schedule ${existing.code} ` +
          `(${existing.startTime}-${existing.endTime}) including ${gapMs / 60000} minute buffer.`
      );
    }
  }

  // Nurse is not in your Schedule model yet, so only check if you add nurse later.
  if (nurse) {
    const nurseBusy = await Schedule.exists({
      ...idFilter,
      nurse,
      status: { $in: ACTIVE_SCHEDULE_STATUSES },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });

    if (nurseBusy) {
      throw new ApiError(409, 'Nurse already assigned in this time range');
    }
  }
};

export const createSession = async (schedule) => {
  const session = await DialysisSession.create({
    schedule: schedule._id,
    patient: schedule.patient,
    chair: schedule.chair,
    nurse: schedule.nurse,
  });

  return session;
};
