import Notification from '../models/Notification.js';

/**
 * Create a notification targeted at one or more roles. Thin wrapper so all
 * callers build notifications consistently. Never throws to the caller — a
 * notification failure must not break the operation that triggered it.
 */
export const notifyRoles = async ({ title, message, type = 'general', priority = 'normal', roles = [], patient, schedule, dueDate }) => {
  try {
    return await Notification.create({
      title,
      message,
      type,
      priority,
      roles,
      patient,
      schedule,
      dueDate,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('notifyRoles failed:', err.message);
    return null;
  }
};

/**
 * Morning roster notification: tells nurses and technicians how many patients
 * are due today, split by shift. De-duplicated per day via a stable title.
 */
export const notifyDailyRoster = async (counts, dateLabel) => {
  const total = (counts?.[1] || 0) + (counts?.[2] || 0) + (counts?.[3] || 0);
  if (!total) return null;

  const title = `Today's dialysis roster — ${dateLabel}`;
  // Skip if we already posted today's roster.
  const existing = await Notification.findOne({ type: 'daily_roster', title }).lean();
  if (existing) return null;

  const message = `${total} patient(s) due today — Shift 1: ${counts[1] || 0}, Shift 2: ${counts[2] || 0}, Shift 3: ${counts[3] || 0}.`;
  return notifyRoles({
    title,
    message,
    type: 'daily_roster',
    priority: 'high',
    roles: ['nurse', 'technician'],
  });
};

/**
 * Station status notification: freed (available again) or needs cleaning.
 */
export const notifyStationStatus = async ({ stationCode, status, patientName }) => {
  const label = status === 'available' ? 'is free' : status === 'cleaning' ? 'needs cleaning' : `is ${status}`;
  return notifyRoles({
    title: `Station ${stationCode} ${label}`,
    message: patientName
      ? `Station ${stationCode} ${label} after ${patientName}'s session.`
      : `Station ${stationCode} ${label}.`,
    type: 'station_status',
    priority: status === 'cleaning' ? 'normal' : 'low',
    roles: ['nurse', 'technician'],
  });
};
