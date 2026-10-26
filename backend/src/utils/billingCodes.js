/*
 * Billing code + fee map for auto-generated claims.
 *
 * IMPORTANT: the dollar amounts here are PLACEHOLDER defaults so a generated
 * claim has a starting total. They are NOT the clinic's contracted rates —
 * replace `fee` values with the facility's real fee schedule, or set them to 0
 * and let the biller enter the contracted amount per claim.
 */

// In-center hemodialysis procedure (one per completed session).
export const DIALYSIS_PROCEDURE = { code: '90935', description: 'Hemodialysis, single evaluation', category: 'dialysis', fee: 0 };

// Common dialysis drug → HCPCS J-code. Matched case-insensitively against the
// medication name (substring). Falls back to a generic DRUG line.
export const DRUG_CODES = [
  { match: 'epoetin', code: 'J0885', description: 'Epoetin alfa (EPO), non-ESRD', fee: 0 },
  { match: 'epo', code: 'J0885', description: 'Epoetin alfa (EPO)', fee: 0 },
  { match: 'darbepoetin', code: 'J0881', description: 'Darbepoetin alfa', fee: 0 },
  { match: 'iron sucrose', code: 'J1756', description: 'Iron sucrose', fee: 0 },
  { match: 'venofer', code: 'J1756', description: 'Iron sucrose (Venofer)', fee: 0 },
  { match: 'ferric gluconate', code: 'J2916', description: 'Sodium ferric gluconate', fee: 0 },
  { match: 'paricalcitol', code: 'J2501', description: 'Paricalcitol', fee: 0 },
  { match: 'calcitriol', code: 'J0636', description: 'Calcitriol', fee: 0 },
  { match: 'doxercalciferol', code: 'J1270', description: 'Doxercalciferol', fee: 0 },
  { match: 'heparin', code: 'J1644', description: 'Heparin sodium (per 1000 units)', fee: 0 },
  { match: 'vitamin d', code: 'J0636', description: 'Vitamin D analog', fee: 0 },
];

export const GENERIC_DRUG = { code: 'DRUG', description: 'Medication administered', category: 'drug', fee: 0 };
export const IV_LINE = { code: 'IV', description: 'IV administration', category: 'iv', fee: 0 };
export const RADIOLOGY_LINE = { code: 'RAD', description: 'Radiology', category: 'radiology', fee: 0 };

// Resolve a medication name to its drug billing code.
export function drugCodeFor(name = '') {
  const n = String(name).toLowerCase();
  const hit = DRUG_CODES.find((d) => n.includes(d.match));
  return hit ? { code: hit.code, description: hit.description, fee: hit.fee } : { code: GENERIC_DRUG.code, description: name || GENERIC_DRUG.description, fee: GENERIC_DRUG.fee };
}
