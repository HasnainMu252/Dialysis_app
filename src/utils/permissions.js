import { ROLES } from '../constants';

/* ------------------------------------------------------------------ *
 * Capability helpers (existing API preserved)
 * ------------------------------------------------------------------ */
export const canEditPatient = (role) => [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
].includes(role);

export const canCreateSchedule = (role) => [ROLES.ADMIN, ROLES.FRONT_DESK].includes(role);
export const canManageSchedule = (role) => [ROLES.ADMIN, ROLES.FRONT_DESK].includes(role);
export const canManageChairClearance = (role) => [ROLES.ADMIN, ROLES.TECHNICIAN].includes(role);

export const canUploadPatientDocuments = (role) => [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
].includes(role);

export const canEditInsurance = (role) => [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
].includes(role);

export const canViewSchedule = (role) => [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
  ROLES.NURSE,
  ROLES.TECHNICIAN,
  ROLES.SOCIAL_WORKER,
  ROLES.DOCTOR,
].includes(role);

export const canForceNotify = (role) => role === ROLES.ADMIN;

/* Doctors (and admins) may create SOAP rounds and upload multiple documents. */
export const canAddDoctorRound = (role) => [ROLES.ADMIN, ROLES.DOCTOR].includes(role);

export const canViewReports = (role) => [ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR].includes(role);

/* Home medications: Doctor, Nurse and Admin may add/delete.
 * Technicians are VIEW-ONLY for all medications (dialysis + home). */
export const canManageHomeMedication = (role) => [ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR].includes(role);

/* Dialysis medications recorded during a session: same writers as home meds.
 * Medications are add + delete only (no in-place edit). */
export const canManageDialysisMedication = (role) => [ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR].includes(role);

/* Technician's write surface during dialysis: access-type + free-text notes.
 * Nurses/doctors/admins may also leave notes. */
export const canAddSessionNote = (role) =>
  [ROLES.ADMIN, ROLES.NURSE, ROLES.DOCTOR, ROLES.TECHNICIAN].includes(role);

/* ------------------------------------------------------------------ *
 * Patient-detail tabs per role (single source of truth for the UI)
 * ------------------------------------------------------------------ */
export const PATIENT_TAB_LABELS = {
  overview: 'Overview',
  'full profile': 'Full Profile',
  'medical history': 'Medical History',
  'insurance form': 'Insurance Form',
  documents: 'Documents',
  schedules: 'Schedules',
  sessions: 'Sessions',
  'doctor rounds': 'Doctor Rounds',
  cqi: 'CQI',
  'medication history': 'Medication History',
  'home medication': 'Home Medications',
  'cqi comments': 'CQI Comments',
  'lab reports': 'Lab Reports',
  'dialysis prescription': 'Dialysis Prescription',
  'billing history': 'Billing History',
};

/* Full patient-detail tab set (matches Admin). Roles pointed here see everything.
 * NOTE: "Treatment History" was removed — the Sessions tab is the single source
 * of treatment + session history. Claims has been removed app-wide. */
const FULL_TABS = [
  'overview', 'full profile', 'medical history', 'insurance form', 'documents',
  'schedules', 'sessions', 'doctor rounds', 'cqi', 'cqi comments',
  'medication history', 'home medication', 'lab reports', 'dialysis prescription', 'billing history',
];

/* Same as Admin but WITHOUT Billing History — for Front Desk, Nurse, Technician. */
const STAFF_FULL_TABS = FULL_TABS.filter((t) => t !== 'billing history');

const TABS_BY_ROLE = {
  // Admin sees the full patient view (incl. Billing History).
  [ROLES.ADMIN]: FULL_TABS,
  // Front Desk, Nurse and Technician: everything Admin has EXCEPT Billing History.
  [ROLES.FRONT_DESK]: STAFF_FULL_TABS,
  [ROLES.NURSE]: STAFF_FULL_TABS,
  [ROLES.TECHNICIAN]: STAFF_FULL_TABS,

  [ROLES.INSURANCE_PERSON]: [
    'overview', 'full profile', 'insurance form', 'documents',
    'schedules', 'sessions', 'doctor rounds',
  ],
  [ROLES.BILLER]: [
    'overview', 'full profile', 'insurance form', 'documents',
    'schedules', 'sessions', 'medication history', 'billing history',
  ],
  [ROLES.DOCTOR]: [
    'overview', 'full profile', 'medical history', 'doctor rounds',
    'cqi', 'documents', 'schedules', 'sessions', 'medication history', 'home medication', 'cqi comments', 'lab reports', 'dialysis prescription',
  ],
  [ROLES.SOCIAL_WORKER]: [
    'overview', 'documents', 'schedules', 'sessions', 'cqi comments',
  ],
};

const READ_ONLY_TABS_BY_ROLE = {
  [ROLES.INSURANCE_PERSON]: ['sessions', 'doctor rounds'],
};

export const patientTabsForRole = (role) => {
  let keys = TABS_BY_ROLE[role] || ['overview'];
  // Nurses and technicians don't manage CQI comments or the insurance form,
  // so hide those tabs from the patient detail view for them.
  if (role === ROLES.NURSE || role === ROLES.TECHNICIAN) {
    keys = keys.filter((k) => k !== 'cqi' && k !== 'cqi comments' && k !== 'insurance form');
  }
  return keys.map((key) => ({ key, label: PATIENT_TAB_LABELS[key] || key }));
};

export const isTabReadOnly = (role, tabKey) =>
  (READ_ONLY_TABS_BY_ROLE[role] || []).includes(tabKey);

/* ------------------------------------------------------------------ *
 * Sidebar navigation per role -> [label, path, iconKey]
 * ------------------------------------------------------------------ */
export const NAV_BY_ROLE = {
  [ROLES.ADMIN]: [
    ['Admin Dashboard', '/admin', 'home'],
    ['User Management', '/admin/users', 'users'],
    ['Audit Trail', '/admin/audit-logs', 'activity'],
    ['Patients', '/front-desk/patients', 'users'],
    ['Create Schedule', '/front-desk/scheduling', 'calendar'],
    ['Schedules', '/schedules', 'calendar'],
    ['Station Maintenance', '/technician/maintenance', 'wrench'],
    ['Treatment Workflow', '/workflow', 'stethoscope'],
    ['Batch Monthly Round', '/doctor/batch-round', 'stethoscope'],
    ['Batch Edit', '/doctor/batch-edit', 'activity'],
    ['CQI', '/doctor/cqi', 'chart'],
    ['Physician Billing', '/biller/physician-billing', 'card'],
    ['Dialysis Billing', '/biller/dialysis-billing', 'activity'],
    ['Medication Billing', '/biller/medication-billing', 'card'],
    ['Reports', '/reports', 'chart'],
  ],
  [ROLES.FRONT_DESK]: [
    ['Front Desk Dashboard', '/front-desk', 'home'],
    ['Patients', '/front-desk/patients', 'users'],
    ['Register Patient', '/patients/new', 'users'],
    ['Create Schedule', '/front-desk/scheduling', 'calendar'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.NURSE]: [
    ['Nurse Dashboard', '/nurse', 'home'],
    ['Patients', '/patients', 'users'],
    ['Treatment Workflow', '/workflow', 'activity'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.TECHNICIAN]: [
    ['Technician Dashboard', '/technician', 'home'],
    ['Patients', '/patients', 'users'],
    ['Station Maintenance', '/technician/maintenance', 'wrench'],
    ['Treatment Workflow', '/workflow', 'activity'],
  ],
  [ROLES.SOCIAL_WORKER]: [
    ['Social Worker Dashboard', '/social-worker', 'home'],
    ['Patients', '/patients', 'users'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.BILLER]: [
    ['Biller Dashboard', '/biller', 'home'],
    ['Patients', '/patients', 'users'],
    ['Doctor Rounds', '/biller/doctor-rounds', 'stethoscope'],
    ['Physician Billing', '/biller/physician-billing', 'card'],
    ['Dialysis Billing', '/biller/dialysis-billing', 'activity'],
    ['Medication Billing', '/biller/medication-billing', 'card'],
    ['Schedules', '/schedules', 'calendar'],
    ['Reports', '/reports', 'chart'],
  ],
  [ROLES.INSURANCE_PERSON]: [
    ['Insurance Dashboard', '/insurance', 'home'],
    ['Patients / Insurance', '/patients', 'users'],
    ['Register Patient', '/patients/new', 'users'],
  ],
  [ROLES.DOCTOR]: [
    ['Doctor Dashboard', '/doctor', 'home'],
    ['Patient Records', '/patients', 'users'],
    ['Batch Monthly Round', '/doctor/batch-round', 'stethoscope'],
    ['Batch Edit', '/doctor/batch-edit', 'activity'],
    ['CQI', '/doctor/cqi', 'chart'],
    ['Reports', '/reports', 'chart'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.PATIENT]: [
    ['Patient Dashboard', '/patient', 'home'],
  ],
};

export const navForRole = (role) => NAV_BY_ROLE[role] || [];
