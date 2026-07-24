export const ROLES = Object.freeze({
  ADMIN: 'admin',
  FRONT_DESK: 'front_desk',
  BILLER: 'biller',
  INSURANCE_PERSON: 'insurance_person',
  NURSE: 'nurse',
  TECHNICIAN: 'technician',
  SOCIAL_WORKER: 'social_worker',
  PATIENT: 'patient',
  DOCTOR: 'doctor',
});

export const ALL_STAFF_ROLES = Object.freeze(
  Object.values(ROLES).filter((r) => r !== ROLES.PATIENT)
);

export const CHAIR_STATUS = ['available', 'reserved', 'in_use', 'cleaning', 'maintenance', 'out_of_order'];
export const QUEUE_STATUS = ['waiting', 'in_treatment', 'completed', 'late', 'no_show', 'cancelled'];

// Treatment can begin without the legacy multi-step clearance gate.
// 'pending_review' = technician submitted, awaiting nurse sign-off.
export const SESSION_STATUS = ['scheduled', 'checked_in', 'ready', 'in_progress', 'pending_review', 'completed', 'cancelled', 'no_show'];

/**
 * Fixed treatment shifts. Gaps between shifts (08:00-09:00 and 12:00-12:30)
 * are station cleaning / buffer time.
 */
export const SHIFTS = [
  { id: 1, label: '1st Shift', start: '05:00', end: '08:00' },
  { id: 2, label: '2nd Shift', start: '09:00', end: '12:00' },
  { id: 3, label: '3rd Shift', start: '12:30', end: '16:00' },
];

/** Minutes since midnight from "HH:MM". */
export const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
};

/**
 * Resolve which shift a start time belongs to.
 * A time inside a shift window matches that shift; otherwise the nearest
 * shift whose window has not yet ended (so buffer-time bookings still group).
 */
export const shiftIdFor = (startTime) => {
  const mins = toMinutes(startTime);
  if (mins === null) return null;
  for (const s of SHIFTS) {
    if (mins >= toMinutes(s.start) && mins < toMinutes(s.end)) return s.id;
  }
  for (const s of SHIFTS) {
    if (mins < toMinutes(s.start)) return s.id;
  }
  return null;
};

export const INSURANCE_STATUS = ['not_submitted', 'submitted', 'approved', 'rejected', 'expired'];
export const PAYMENT_STATUS = ['pending', 'submitted', 'paid', 'denied', 'partial'];
export const DOCTOR_CHECKUP_STATUS = ['draft', 'completed', 'missed'];
export const SOAP_ROUNDS = [1, 2, 3, 4];
