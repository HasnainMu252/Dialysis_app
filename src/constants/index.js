export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const ROLES = {
  ADMIN: 'admin',
  FRONT_DESK: 'front_desk',
  BILLER: 'biller',
  NURSE: 'nurse',
  SOCIAL_WORKER: 'social_worker',
  TECHNICIAN: 'technician',
  PATIENT: 'patient',
  INSURANCE_PERSON: 'insurance_person',
  DOCTOR: 'doctor',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  front_desk: 'Front Desk',
  biller: 'Biller',
  nurse: 'Nurse',
  social_worker: 'Social Worker',
  technician: 'Technician',
  patient: 'Patient',
  insurance_person: 'Insurance Person',
  doctor: 'Doctor',
};

export const CHAIR_STATUS = ['available', 'reserved', 'in_use', 'cleaning', 'out_of_order', 'maintenance'];
export const QUEUE_STATUS = ['waiting', 'in_treatment', 'completed', 'late', 'no_show', 'cancelled'];
export const CLEARANCE_TYPES = ['billing', 'technician', 'nurse', 'social_worker', 'dietary'];
export const CLEARANCE_STATUS = ['pending', 'cleared', 'rejected', 'needs_review'];
export const SESSION_STATUS = ['scheduled', 'checked_in', 'clearance_pending', 'ready', 'in_progress', 'completed', 'cancelled', 'no_show'];
export const INSURANCE_STATUS = ['not_submitted', 'submitted', 'approved', 'rejected', 'expired'];
export const PAYMENT_STATUS = ['pending', 'submitted', 'paid', 'denied', 'partial'];

export const roleHome = {
  admin: '/admin',
  front_desk: '/front-desk',
  nurse: '/nurse',
  technician: '/technician',
  social_worker: '/social-worker',
  biller: '/biller',
  insurance_person: '/insurance',
  patient: '/patient',
  doctor: '/doctor',
};

export const statusColor = {
  available: 'bg-green-100 text-green-700 border-green-200',
  reserved: 'bg-red-100 text-red-700 border-red-200',
  in_use: 'bg-red-100 text-red-700 border-red-200',
  cleaning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  out_of_order: 'bg-slate-200 text-slate-700 border-slate-300',
  maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cleared: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  needs_review: 'bg-orange-100 text-orange-700 border-orange-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  checked_in: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  denied: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-orange-100 text-orange-700 border-orange-200',
  not_submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  insurance_expiry: 'bg-amber-100 text-amber-700 border-amber-200',
  insurance_approval: 'bg-blue-100 text-blue-700 border-blue-200',
  general: 'bg-slate-100 text-slate-700 border-slate-200',
  read: 'bg-green-100 text-green-700 border-green-200',
  unread: 'bg-blue-100 text-blue-700 border-blue-200',
};
