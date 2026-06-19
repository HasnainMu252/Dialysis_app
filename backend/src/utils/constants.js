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
export const SESSION_STATUS = ['scheduled', 'checked_in', 'ready', 'in_progress', 'completed', 'cancelled', 'no_show'];

export const INSURANCE_STATUS = ['not_submitted', 'submitted', 'approved', 'rejected', 'expired'];
export const PAYMENT_STATUS = ['pending', 'submitted', 'paid', 'denied', 'partial'];
export const DOCTOR_CHECKUP_STATUS = ['draft', 'completed', 'missed'];
export const SOAP_ROUNDS = [1, 2, 3, 4];
