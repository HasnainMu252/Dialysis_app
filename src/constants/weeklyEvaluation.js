// Weekly Dialysis Evaluation — concise checkbox template (config-driven).
const PRESENT_ABSENT = ['', 'Absent', 'Present'];

export const WEEKLY_SECTIONS = [
  {
    key: 'subjective',
    title: 'Subjective',
    fields: [
      { key: 'noComplaints', label: 'No complaints', type: 'check' },
      { key: 'deniesSob', label: 'Denies SOB / PND / orthopnea', type: 'check' },
      { key: 'deniesCough', label: 'Denies cough / fever / chills', type: 'check' },
      { key: 'deniesCp', label: 'Denies CP / palpitations', type: 'check' },
      { key: 'noDizziness', label: 'During/Post: no dizziness', type: 'check' },
      { key: 'noCpPost', label: 'During/Post: no CP / palpitations', type: 'check' },
      { key: 'noDiaphoresis', label: 'During/Post: no diaphoresis', type: 'check' },
      { key: 'noCramps', label: 'During/Post: no cramps', type: 'check' },
      { key: 'noNv', label: 'During/Post: no N/V', type: 'check' },
    ],
  },
  {
    key: 'exam',
    title: 'Physical Exam',
    fields: [
      { key: 'sheent', label: 'SHEENT normal', type: 'check' },
      { key: 'lungs', label: 'Lungs clear', type: 'check' },
      { key: 'cardiac', label: 'Cardiac RRR', type: 'check' },
      { key: 'sem', label: 'SEM', type: 'select', options: PRESENT_ABSENT },
      { key: 'abdomen', label: 'Abdomen soft / NT', type: 'check' },
      { key: 'neuroAO', label: 'Neuro A&O', type: 'check' },
      { key: 'ueNeuropathy', label: 'UE neuropathy', type: 'select', options: PRESENT_ABSENT },
      { key: 'leDeficit', label: 'LE deficit', type: 'select', options: PRESENT_ABSENT },
      { key: 'charcot', label: 'Charcot foot', type: 'select', options: PRESENT_ABSENT },
      { key: 'noEdema', label: 'Extremities: no edema', type: 'check' },
      { key: 'pulsesIntact', label: 'Pulses intact', type: 'check' },
      { key: 'noUlcers', label: 'No ulcers', type: 'check' },
    ],
  },
  {
    key: 'access',
    title: 'Access',
    fields: [
      { key: 'accessType', label: 'Access type', type: 'select', options: ['', 'Permacath', 'AV Fistula', 'AV Graft'] },
      { key: 'permNoInfection', label: 'Permacath: no infection / discharge', type: 'check' },
      { key: 'fistNoInfection', label: 'Fistula: no infection', type: 'check' },
      { key: 'fistNoPseudo', label: 'Fistula: no pseudoaneurysm', type: 'check' },
      { key: 'fistNoUlcer', label: 'Fistula: no ulceration', type: 'check' },
      { key: 'fistGoodFlow', label: 'Fistula: good distal flow', type: 'check' },
      { key: 'fistNoSteal', label: 'Fistula: no steal', type: 'check' },
      { key: 'fistNoDeficit', label: 'Fistula: no motor / sensory deficit', type: 'check' },
      { key: 'graftBruit', label: 'Graft: good bruit', type: 'check' },
      { key: 'graftMature', label: 'Graft: mature', type: 'check' },
      { key: 'graftNoEdema', label: 'Graft: no edema', type: 'check' },
      { key: 'graftNoSteal', label: 'Graft: no steal', type: 'check' },
    ],
  },
  {
    key: 'labs',
    title: 'Labs / Treatment',
    fields: [
      { key: 'anemia', label: 'Anemia: EPO / Iron adequate', type: 'check' },
      { key: 'calcium', label: 'Ca ok', type: 'check' },
      { key: 'phos', label: 'Phos stable', type: 'check' },
      { key: 'pth', label: 'PTH', type: 'select', options: ['', 'High', 'Low', 'Goal'] },
      { key: 'albumin', label: 'Albumin adequate', type: 'check' },
      { key: 'ktv', label: 'Kt/V adequate', type: 'check' },
      { key: 'dwuf', label: 'DW / UF appropriate', type: 'check' },
      { key: 'bpPre', label: 'BP pre good', type: 'check' },
      { key: 'bpIntra', label: 'BP intra good', type: 'check' },
      { key: 'bpPost', label: 'BP post good', type: 'check' },
      { key: 'neuroWellbeing', label: 'Neuro well-being stable', type: 'check' },
      { key: 'transplant', label: 'Transplant up to date', type: 'check' },
      { key: 'vaccines', label: 'Vaccines reviewed', type: 'check' },
      { key: 'cancer', label: 'Cancer screening per PMD', type: 'check' },
      { key: 'cardiac', label: 'Cardiac care per PMD', type: 'check' },
    ],
  },
];

export const WEEKLY_LABELS = WEEKLY_SECTIONS.reduce((acc, s) => {
  s.fields.forEach((f) => { acc[f.key] = f.label; });
  return acc;
}, {});
