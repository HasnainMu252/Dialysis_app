/**
 * Common renal / dialysis home medications for quick-add.
 * Seeded from the clinic's Current Medicines list. Tapping one prefills the
 * home-medication form so repeated meds don't need re-typing.
 */
export const COMMON_HOME_MEDICATIONS = [
  {
    category: 'Anti-hypertensives',
    items: [
      { name: 'Clonidine', dose: '0.2', unit: 'mg', route: 'PO', frequency: 'BID' },
      { name: 'Clonidine patch', dose: '0.2', unit: 'patch', route: 'Transdermal', frequency: '1st tx weekly' },
      { name: 'Hydralazine HCL', dose: '50', unit: 'mg', route: 'PO', frequency: 'TID' },
      { name: 'Metoprolol', dose: '50', unit: 'mg', route: 'PO', frequency: 'BID' },
    ],
  },
  {
    category: 'Cardiovascular',
    items: [
      { name: 'Lovastatin', dose: '40', unit: 'mg', route: 'PO', frequency: 'Daily' },
      { name: 'Nifedipine ER', dose: '30', unit: 'mg', route: 'PO', frequency: 'BID' },
      { name: 'Nitroglycerin', dose: '0.4', unit: 'mg', route: 'SL', frequency: 'As needed' },
    ],
  },
  {
    category: 'GI',
    items: [
      { name: 'Sucralfate', dose: '2', unit: 'gm', route: 'PO', frequency: 'BID' },
      { name: 'Zofran', dose: '4', unit: 'mg', route: 'PO', frequency: 'BID' },
      { name: 'Carafate', dose: '10', unit: 'mg', route: 'PO', frequency: 'Daily am' },
      { name: 'Protonix', dose: '40', unit: 'mg', route: 'PO', frequency: 'Daily' },
    ],
  },
  {
    category: 'Miscellaneous',
    items: [
      { name: 'Claritin', dose: '10', unit: 'mg', route: 'PO', frequency: 'Daily pm' },
      { name: 'Levothyroxine', dose: '25', unit: 'mcg', route: 'PO', frequency: 'Daily am' },
      { name: 'Loratadine', dose: '10', unit: 'mg', route: 'PO', frequency: 'Daily' },
      { name: 'Maxitrol', dose: '1', unit: 'drop', route: 'Ophthalmic', frequency: 'TID' },
      { name: 'Neutra-Phos', dose: '250', unit: 'mg', route: 'PO', frequency: 'TID' },
      { name: 'Vitamin D2 50,000 units', dose: '1', unit: 'tablet', route: 'PO', frequency: 'Q Friday' },
    ],
  },
  {
    category: 'Pain',
    items: [
      { name: 'Oxycodone', dose: '5', unit: 'mg', route: 'PO', frequency: 'PRN' },
    ],
  },
  {
    category: 'Vitamin',
    items: [
      { name: 'Megace', dose: '40', unit: 'mg', route: 'PO', frequency: 'BID' },
      { name: 'Nephro-Vite', dose: '1', unit: 'tablet', route: 'PO', frequency: 'Daily' },
    ],
  },
];
