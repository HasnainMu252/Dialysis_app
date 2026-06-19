import { ROLES } from './constants.js';

/**
 * Central role -> capability matrix.
 * Single source of truth for backend route authorization.
 */
export const PERMISSIONS = Object.freeze({
  patientReadAll: [
    ROLES.ADMIN,
    ROLES.FRONT_DESK,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
    ROLES.NURSE,
    ROLES.SOCIAL_WORKER,
    ROLES.TECHNICIAN,
    ROLES.DOCTOR,
  ],

  patientWrite: [
    ROLES.ADMIN,
    ROLES.FRONT_DESK,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
  ],

  patientDelete: [ROLES.ADMIN],

  scheduleRead: [
    ROLES.ADMIN,
    ROLES.FRONT_DESK,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
    ROLES.NURSE,
    ROLES.SOCIAL_WORKER,
    ROLES.TECHNICIAN,
    ROLES.DOCTOR,
  ],

  scheduleWrite: [ROLES.ADMIN, ROLES.FRONT_DESK],

  sessionClinical: [ROLES.ADMIN, ROLES.NURSE, ROLES.TECHNICIAN],

  chairOps: [ROLES.ADMIN, ROLES.TECHNICIAN],

  billing: [ROLES.ADMIN, ROLES.BILLER, ROLES.INSURANCE_PERSON],

  socialWork: [ROLES.ADMIN, ROLES.SOCIAL_WORKER],

  insuranceEditors: [
    ROLES.ADMIN,
    ROLES.FRONT_DESK,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
  ],

  insuranceViewers: [
    ROLES.ADMIN,
    ROLES.FRONT_DESK,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
    ROLES.NURSE,
    ROLES.TECHNICIAN,
    ROLES.SOCIAL_WORKER,
    ROLES.DOCTOR,
  ],

  doctorRounds: [ROLES.ADMIN, ROLES.DOCTOR],

  reports: [ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR],
});

/**
 * Field-level projection for patient reads.
 * Admin, Biller, Insurance, Front Desk and Doctor get the full bio + insurance/registration data.
 * Clinical-only roles (Nurse, Technician, Social Worker) get the common bio set.
 */
export const visiblePatientFields = (role) => {
  const common =
    'mrn firstName lastName dob gender phone email address city state zip emergencyContact medicalHistory status sentToBillerAt createdAt updatedAt';

  const fullProfileRoles = [
    ROLES.ADMIN,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
    ROLES.FRONT_DESK,
    ROLES.DOCTOR,
  ];

  if (fullProfileRoles.includes(role)) {
    return `${common} registration insurance patientType homeFacility referralSource hospital`;
  }

  if ([ROLES.NURSE, ROLES.TECHNICIAN, ROLES.SOCIAL_WORKER].includes(role)) {
    return common;
  }

  return 'mrn firstName lastName dob gender phone email address status';
};
