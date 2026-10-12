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
    ROLES.DIETITIAN,
    ROLES.DON,
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
    ROLES.DIETITIAN,
    ROLES.DON,
  ],

  scheduleWrite: [ROLES.ADMIN, ROLES.FRONT_DESK],

  sessionClinical: [ROLES.ADMIN, ROLES.NURSE, ROLES.TECHNICIAN],

  chairOps: [ROLES.ADMIN, ROLES.TECHNICIAN],

  // Biomed (and admin) manage the machine registry + maintenance records.
  machineManage: [ROLES.ADMIN, ROLES.BIOMED],

  // CQI comment authors: clinical roles who meet the patient.
  cqiAuthors: [ROLES.NURSE, ROLES.TECHNICIAN, ROLES.SOCIAL_WORKER, ROLES.DOCTOR, ROLES.DIETITIAN],

  // Monthly CQI review (read-all across patients).
  cqiReview: [ROLES.ADMIN, ROLES.DON],

  billing: [ROLES.ADMIN, ROLES.BILLER, ROLES.INSURANCE_PERSON, ROLES.DON],

  // Purchasing & supply inventory — biller, admin, DON and Biomed.
  inventoryManage: [ROLES.ADMIN, ROLES.BILLER, ROLES.DON, ROLES.BIOMED],

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

  // Fistula / catheter access: nurse and doctor maintain it (plus admin),
  // even though they cannot edit the rest of the patient record.
  vascularAccessWrite: [ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR],

  // Phase C field-level editors.
  socialWorkWrite: [ROLES.ADMIN, ROLES.SOCIAL_WORKER],
  medicalBackgroundWrite: [ROLES.ADMIN, ROLES.SOCIAL_WORKER, ROLES.NURSE, ROLES.DOCTOR, ROLES.FRONT_DESK],
  nutritionWrite: [ROLES.ADMIN, ROLES.DIETITIAN],

  // Weekly dialysis evaluation — doctor and nurse (and admin).
  weeklyEvalWrite: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE],

  // Vaccination log — clinical staff who administer doses.
  vaccinationWrite: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.TECHNICIAN],

  reports: [ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR, ROLES.DON],
});

/**
 * Field-level projection for patient reads.
 * Admin, Biller, Insurance, Front Desk and Doctor get the full bio + insurance/registration data.
 * Clinical-only roles (Nurse, Technician, Social Worker) get the common bio set.
 */
export const visiblePatientFields = (role) => {
  const common =
    'mrn firstName lastName dob gender phone email address city state zip emergencyContact medicalHistory vascularAccess socialWork medicalBackground nutrition weeklyEvaluations vaccinations status shift dayPattern recurring sentToBillerAt createdAt updatedAt';

  const fullProfileRoles = [
    ROLES.ADMIN,
    ROLES.BILLER,
    ROLES.INSURANCE_PERSON,
    ROLES.FRONT_DESK,
    ROLES.DOCTOR,
    ROLES.DON,
  ];

  if (fullProfileRoles.includes(role)) {
    return `${common} registration insurance patientType homeFacility referralSource hospital`;
  }

  if ([ROLES.NURSE, ROLES.TECHNICIAN, ROLES.SOCIAL_WORKER, ROLES.DIETITIAN].includes(role)) {
    return common;
  }

  return 'mrn firstName lastName dob gender phone email address status shift dayPattern recurring';
};
