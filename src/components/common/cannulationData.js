// AVF Cannulation Instruction content — shared by the modal and the full-page entry flow.
export const SECTIONS = [
  {
    n: '1',
    title: 'Pre-Assessment (LLF Algorithm)',
    items: [
      'Look — erythema, edema, hematoma, aneurysm, skin thinning',
      'Listen — continuous bruit; high-pitch systolic = stenosis',
      'Feel — continuous thrill; pulse augmentation test',
      'Confirm maturation: diameter ≥6 mm, depth ≤6 mm, straight segment ≥10 cm',
    ],
  },
  {
    n: '2',
    title: 'Skin Preparation',
    items: [
      'Hand hygiene',
      'Clean gloves',
      'Wash with soap/water if soiled',
      'CHG-alcohol scrub × 30 seconds',
      'Allow full air-dry',
      'Do NOT re-palpate after antisepsis',
    ],
  },
  {
    n: '3',
    title: 'Cannulation Setup',
    items: [
      'Needle gauge: 17G (early use), 15–16G (mature AVF)',
      'Verify arterial vs venous orientation',
      'Confirm prescribed Qb',
      'Position arm for full fistula exposure',
    ],
  },
  {
    n: '4',
    title: 'Cannulation Technique',
    items: [
      'Rope-ladder site selection',
      'Insert at 25–35° angle',
      'Advance until flashback',
      'Drop angle slightly; advance 2–3 mm',
      'Secure needle without kinking',
      'Confirm stable arterial/venous pressures',
    ],
  },
  {
    n: '5',
    title: 'Troubleshooting',
    items: [
      'High arterial pressure → inflow stenosis or malposition',
      'High venous pressure → outflow stenosis or kink',
      'Flashback but no flow → needle against vessel wall',
      'Infiltration → stop, ice × 20 min, avoid site ≥1 week',
    ],
  },
  {
    n: '6',
    title: 'During Dialysis',
    items: [
      'Reassess thrill and bruit',
      'Monitor pressures and Qb',
      'Inspect for swelling, pain, hematoma',
      'Document abnormalities immediately',
    ],
  },
  {
    n: '7',
    title: 'Needle Removal & Post-Care',
    items: [
      'Remove needles smoothly',
      'Apply gentle pressure with sterile gauze',
      'Avoid excessive pressure',
      'Inspect for bleeding or hematoma',
      'Reassess thrill and bruit before discharge',
    ],
  },
  {
    n: '8',
    title: 'Critical Safety Rules',
    items: [
      'Max 2 attempts per staff member',
      'Max 4 attempts total',
      'Escalate after 2 failures',
      'Notify nephrologist after 4 failures',
      'Avoid cannulation near aneurysm edges',
      'Buttonhole only with nephrologist order',
    ],
  },
];

export const MINI = [
  'LLF done',
  'CHG-alcohol scrub',
  'Rope-ladder site',
  'Correct needle gauge',
  '25–35° angle',
  'No re-palpation',
  'Pressures stable',
  'Document',
];
