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

export const canViewReports = (role) => [ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR, ROLES.DON].includes(role);

/* Biomed (and admin) manage the machine registry. */
export const canManageMachines = (role) => [ROLES.ADMIN, ROLES.BIOMED].includes(role);

/* Admin and DON review all CQI comments month-end. */
export const canReviewCqi = (role) => [ROLES.ADMIN, ROLES.DON].includes(role);

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
  'social work': 'Social Work',
  'medical background': 'Medical Background',
  vaccination: 'Vaccination',
  'dietitian assessment': 'Dietitian Assessment',
  nutrition: 'Nutrition',
  'weekly evaluation': 'Weekly Evaluation',
  'monthly round': 'Monthly Round',
  orders: 'Orders',
};

/* Full patient-detail tab set (matches Admin). Roles pointed here see everything.
 * NOTE: "Treatment History" was removed — the Sessions tab is the single source
 * of treatment + session history. Claims has been removed app-wide. */
const FULL_TABS = [
  'overview', 'full profile', 'medical history', 'medical background', 'vaccination', 'insurance form', 'documents',
  'schedules', 'sessions', 'doctor rounds', 'weekly evaluation', 'monthly round', 'orders', 'cqi', 'social work', 'nutrition', 'dietitian assessment',
  'medication history', 'home medication', 'lab reports', 'dialysis prescription', 'billing history',
];

/* Same as Admin but WITHOUT Billing History — for Front Desk, Technician.
   Orders are doctor/nurse-only, so they are excluded here too. */
const STAFF_FULL_TABS = FULL_TABS.filter((t) => t !== 'billing history' && t !== 'orders');
/* Nurse: staff tabs PLUS the Orders tab (nurse carries out doctor orders). */
const NURSE_TABS = [...STAFF_FULL_TABS, 'orders'];

const TABS_BY_ROLE = {
  // Admin sees the full patient view (incl. Billing History + Orders).
  [ROLES.ADMIN]: FULL_TABS,
  // Front Desk and Technician: everything Admin has EXCEPT Billing History + Orders.
  [ROLES.FRONT_DESK]: STAFF_FULL_TABS,
  [ROLES.NURSE]: NURSE_TABS,
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
    'overview', 'full profile', 'medical history', 'medical background', 'vaccination', 'doctor rounds',
    'weekly evaluation', 'monthly round', 'orders',
    'cqi', 'documents', 'schedules', 'sessions', 'medication history', 'home medication',
    'social work', 'nutrition', 'dietitian assessment', 'lab reports', 'dialysis prescription',
  ],
  [ROLES.SOCIAL_WORKER]: [
    'overview', 'documents', 'schedules', 'sessions', 'cqi',
    'social work', 'medical background',
  ],
  [ROLES.DIETITIAN]: [
    'overview', 'medical history', 'medical background', 'lab reports', 'cqi',
    'nutrition', 'dietitian assessment', 'schedules', 'sessions', 'documents',
  ],
  [ROLES.DON]: [
    'overview', 'full profile', 'medical history', 'medical background', 'vaccination', 'doctor rounds',
    'weekly evaluation', 'monthly round',
    'cqi', 'social work', 'nutrition', 'dietitian assessment', 'schedules', 'sessions', 'medication history',
    'lab reports', 'documents', 'billing history',
  ],
};

const READ_ONLY_TABS_BY_ROLE = {
  [ROLES.INSURANCE_PERSON]: ['sessions', 'doctor rounds'],
};

export const patientTabsForRole = (role) => {
  let keys = TABS_BY_ROLE[role] || ['overview'];
  // Nurses and technicians don't manage the insurance form, but they DO keep
  // the unified CQI log (they meet the patient during treatment).
  if (role === ROLES.NURSE || role === ROLES.TECHNICIAN) {
    keys = keys.filter((k) => k !== 'insurance form');
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
    ['Weekly Evaluation', '/doctor/weekly', 'activity'],
    ['Monthly Round', '/doctor/monthly', 'stethoscope'],
    ['CQI', '/doctor/cqi', 'chart'],
    ['CQI Review', '/cqi/review', 'chart'],
    ['Machines', '/biomed', 'wrench'],
    ['Orders', '/orders', 'card'],
    ['Billing', '/billing', 'card'],
    ['Inventory', '/billing/inventory', 'card'],
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
    ['Orders', '/orders', 'card'],
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
    ['Billing', '/billing', 'card'],
    ['Inventory', '/billing/inventory', 'card'],
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
    ['Orders', '/orders', 'card'],
    ['Weekly Evaluation', '/doctor/weekly', 'activity'],
    ['Monthly Round', '/doctor/monthly', 'stethoscope'],
    ['CQI', '/doctor/cqi', 'chart'],
    ['Reports', '/reports', 'chart'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.PATIENT]: [
    ['Patient Dashboard', '/patient', 'home'],
  ],
  [ROLES.DIETITIAN]: [
    ['Dietitian Dashboard', '/dietitian', 'home'],
    ['Patients', '/patients', 'users'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.DON]: [
    ['DON Dashboard', '/don', 'home'],
    ['Patients', '/patients', 'users'],
    ['CQI Review', '/cqi/review', 'chart'],
    ['Billing', '/billing', 'card'],
    ['Inventory', '/billing/inventory', 'card'],
    ['Reports', '/reports', 'chart'],
    ['Schedules', '/schedules', 'calendar'],
  ],
  [ROLES.BIOMED]: [
    ['Biomed — Stations', '/biomed', 'wrench'],
    ['Station Maintenance', '/technician/maintenance', 'wrench'],
    ['Inventory', '/billing/inventory', 'card'],
  ],
};

export const navForRole = (role) => NAV_BY_ROLE[role] || [];
