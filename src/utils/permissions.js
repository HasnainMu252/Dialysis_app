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
  treatment: 'Treatment History',
  'doctor rounds': 'Doctor Rounds',
  claims: 'Claims',
};

const TABS_BY_ROLE = {
  [ROLES.ADMIN]: [
    'overview', 'full profile', 'insurance form', 'documents',
    'schedules', 'sessions', 'claims', 'treatment', 'doctor rounds',
  ],
  [ROLES.INSURANCE_PERSON]: [
    'overview', 'full profile', 'insurance form', 'documents',
    'schedules', 'treatment', 'doctor rounds',
  ],
  [ROLES.BILLER]: [
    'overview', 'full profile', 'insurance form', 'documents',
    'schedules', 'sessions', 'claims', 'treatment',
  ],
  [ROLES.FRONT_DESK]: [
    'overview', 'full profile', 'insurance form', 'documents', 'schedules',
  ],
  [ROLES.DOCTOR]: [
    'overview', 'full profile', 'medical history', 'doctor rounds',
    'documents', 'schedules', 'treatment',
  ],
  [ROLES.NURSE]: [
    'overview', 'medical history', 'schedules', 'sessions', 'treatment',
  ],
  [ROLES.TECHNICIAN]: [
    'overview', 'schedules', 'treatment',
  ],
  [ROLES.SOCIAL_WORKER]: [
    'overview', 'documents', 'schedules', 'treatment',
  ],
};

const READ_ONLY_TABS_BY_ROLE = {
  [ROLES.INSURANCE_PERSON]: ['treatment', 'doctor rounds'],
};

export const patientTabsForRole = (role) => {
  const keys = TABS_BY_ROLE[role] || ['overview'];
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
    ['Patients', '/front-desk/patients', 'users'],
    ['Create Schedule', '/front-desk/scheduling', 'calendar'],
    ['Schedules', '/schedules', 'calendar'],
    ['Chairs', '/chairs', 'chair'],
    ['Chair Maintenance', '/technician/maintenance', 'wrench'],
    ['Sessions', '/sessions', 'activity'],
    ['Treatment Workflow', '/workflow', 'stethoscope'],
    ['Reports', '/reports', 'chart'],
    ['Billing Claims', '/biller/claims', 'card'],
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
    ['Sessions', '/sessions', 'stethoscope'],
    ['Treatment Workflow', '/workflow', 'activity'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.TECHNICIAN]: [
    ['Technician Dashboard', '/technician', 'home'],
    ['Patients', '/patients', 'users'],
    ['Chairs Status', '/chairs', 'chair'],
    ['Chair Maintenance', '/technician/maintenance', 'wrench'],
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
    ['Billing Claims', '/biller/claims', 'card'],
    ['Doctor Rounds', '/biller/doctor-rounds', 'stethoscope'],
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
    ['Reports', '/reports', 'chart'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.PATIENT]: [
    ['Patient Dashboard', '/patient', 'home'],
  ],
};

export const navForRole = (role) => NAV_BY_ROLE[role] || [];
