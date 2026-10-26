// Single, unified dialysis vascular-access option list used everywhere
// (patient bio, flow sheet, reports). A patient has ONE access.
export const ACCESS_TYPES = [
  { value: 'Fistula', label: 'Fistula' },
  { value: 'AV Graft', label: 'AV Graft' },
  { value: 'Non-tunnel catheter', label: 'Non-tunnel catheter' },
  { value: 'Tunnel catheter', label: 'Tunnel catheter' },
  { value: 'Not applicable', label: 'Not applicable' },
  { value: 'Other', label: 'Other' },
];

export const ACCESS_LOCATIONS = ['Left Arm', 'Right Arm', 'Left Chest', 'Right Chest', 'Neck', 'Femoral'];

export const ACCESS_STATUSES = ['Active', 'Inactive', 'Failed', 'Under Maturation'];

// Legacy stored codes → readable labels (old records used these codes).
const LEGACY = {
  AVF: 'Fistula',
  AVG: 'AV Graft',
  TUNNELED_CVC: 'Tunnel catheter',
  NON_TUNNELED_CVC: 'Non-tunnel catheter',
  av_fistula: 'Fistula',
  av_graft: 'AV Graft',
  permacath: 'Tunnel catheter',
};

// Readable label for a stored value; maps legacy codes, passes through strings.
export const accessTypeLabel = (value) => (value ? (LEGACY[value] || value) : '');
