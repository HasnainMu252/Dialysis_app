// Structured Monthly Physician Round configuration (Doctor Module V2).
// Drives checkbox/dropdown rendering instead of free typing.

const NORMAL_ABNORMAL = ['Normal', 'Abnormal', 'Not assessed'];
const PRESENT_ABSENT = ['Absent', 'Present', 'Not assessed'];

export const ROUND_SECTIONS = [
  {
    key: 'subjective',
    title: 'Section A — Subjective / Review of Systems',
    fields: [
      { key: 'reviewOfSystems', label: 'Review of Systems', type: 'text' },
      { key: 'homeSymptoms', label: 'Home Symptoms', type: 'text' },
      { key: 'dialysisSymptoms', label: 'Dialysis Symptoms', type: 'text' },
      { key: 'chestPain', label: 'Chest Pain', type: 'check' },
      { key: 'palpitations', label: 'Palpitations', type: 'check' },
      { key: 'shortnessOfBreath', label: 'Shortness of Breath', type: 'check' },
      { key: 'legCramps', label: 'Leg Cramps', type: 'check' },
      { key: 'nausea', label: 'Nausea', type: 'check' },
      { key: 'vomiting', label: 'Vomiting', type: 'check' },
      { key: 'fever', label: 'Fever', type: 'check' },
      { key: 'chills', label: 'Chills', type: 'check' },
    ],
  },
  {
    key: 'physicalExam',
    title: 'Section B — Physical Examination',
    fields: [
      { key: 'sheent', label: 'SHEENT', type: 'select', options: NORMAL_ABNORMAL },
      { key: 'lungs', label: 'Lungs', type: 'select', options: NORMAL_ABNORMAL },
      { key: 'cardiac', label: 'Cardiac', type: 'select', options: NORMAL_ABNORMAL },
      { key: 'abdomen', label: 'Abdomen', type: 'select', options: NORMAL_ABNORMAL },
      { key: 'neurological', label: 'Neurological', type: 'select', options: NORMAL_ABNORMAL },
      { key: 'extremities', label: 'Extremities', type: 'select', options: NORMAL_ABNORMAL },
    ],
  },
  {
    key: 'accessEvaluation',
    title: 'Section C — Access Evaluation',
    fields: [
      { key: 'type', label: 'Access Type', type: 'select', options: ['Permacath', 'AV Fistula', 'AV Graft'] },
      { key: 'infection', label: 'Infection', type: 'select', options: PRESENT_ABSENT },
      { key: 'bruit', label: 'Bruit', type: 'select', options: ['Present', 'Absent'] },
      { key: 'thrill', label: 'Thrill', type: 'select', options: ['Present', 'Absent'] },
      { key: 'ulceration', label: 'Ulceration', type: 'select', options: PRESENT_ABSENT },
      { key: 'stealSyndrome', label: 'Steal Syndrome', type: 'select', options: PRESENT_ABSENT },
      { key: 'motorDeficit', label: 'Motor Deficit', type: 'select', options: PRESENT_ABSENT },
      { key: 'sensoryDeficit', label: 'Sensory Deficit', type: 'select', options: PRESENT_ABSENT },
    ],
  },
  {
    key: 'laboratoryReview',
    title: 'Section D — Laboratory Review',
    fields: [
      { key: 'anemiaManagement', label: 'Anemia Management', type: 'select', options: ['At goal', 'Below goal', 'Above goal', 'Adjusted'] },
      { key: 'boneMineralDisease', label: 'Bone Mineral Disease', type: 'select', options: ['Controlled', 'Uncontrolled', 'Adjusted'] },
      { key: 'pth', label: 'PTH', type: 'text' },
      { key: 'calcium', label: 'Calcium', type: 'text' },
      { key: 'phosphorus', label: 'Phosphorus', type: 'text' },
      { key: 'nutrition', label: 'Nutrition', type: 'select', options: ['Adequate', 'Inadequate', 'Referred to dietitian'] },
      { key: 'albumin', label: 'Albumin', type: 'text' },
      { key: 'ktV', label: 'Dialysis Adequacy (Kt/V)', type: 'text' },
      { key: 'dryWeight', label: 'Dry Weight', type: 'text' },
      { key: 'ultrafiltration', label: 'Ultrafiltration', type: 'text' },
      { key: 'bloodPressure', label: 'Blood Pressure', type: 'text' },
      { key: 'transplantStatus', label: 'Transplant Status', type: 'select', options: ['Not a candidate', 'Being evaluated', 'On waitlist', 'Transplanted'] },
      { key: 'vaccination', label: 'Vaccination', type: 'select', options: ['Up to date', 'Due', 'Declined'] },
      { key: 'cancerScreening', label: 'Cancer Screening', type: 'select', options: ['Up to date', 'Due', 'Declined'] },
      { key: 'cardiovascularReview', label: 'Cardiovascular Review', type: 'select', options: NORMAL_ABNORMAL },
    ],
  },
];

export const emptyPhysicianRound = () =>
  ROUND_SECTIONS.reduce((acc, section) => {
    acc[section.key] = {};
    section.fields.forEach((f) => { acc[section.key][f.key] = f.type === 'check' ? false : ''; });
    return acc;
  }, {});

// Built-in templates auto-fill the form; the doctor edits only what's needed.
export const ROUND_TEMPLATES = {
  'Stable Dialysis': {
    physicianRound: {
      subjective: { reviewOfSystems: 'No new complaints', homeSymptoms: 'None', dialysisSymptoms: 'Tolerating dialysis well' },
      physicalExam: { sheent: 'Normal', lungs: 'Normal', cardiac: 'Normal', abdomen: 'Normal', neurological: 'Normal', extremities: 'Normal' },
      accessEvaluation: { infection: 'Absent', bruit: 'Present', thrill: 'Present', ulceration: 'Absent', stealSyndrome: 'Absent' },
      laboratoryReview: { anemiaManagement: 'At goal', boneMineralDisease: 'Controlled', nutrition: 'Adequate', cardiovascularReview: 'Normal' },
    },
    doctorComments: 'Patient stable on current dialysis prescription. Continue plan.',
  },
  'Weekly Review': {
    physicianRound: {
      subjective: { reviewOfSystems: 'Reviewed; stable', dialysisSymptoms: 'Stable' },
      physicalExam: { lungs: 'Normal', cardiac: 'Normal' },
    },
    doctorComments: 'Weekly review completed. No acute issues.',
  },
  'CKD Stable': {
    physicianRound: {
      subjective: { reviewOfSystems: 'CKD stable, no decompensation' },
      laboratoryReview: { anemiaManagement: 'At goal', boneMineralDisease: 'Controlled' },
    },
    doctorComments: 'CKD stable. Continue conservative management.',
  },
  'Routine Monthly Review': {
    physicianRound: {
      subjective: { reviewOfSystems: 'Routine monthly assessment', homeSymptoms: 'None', dialysisSymptoms: 'None' },
      physicalExam: { sheent: 'Normal', lungs: 'Normal', cardiac: 'Normal', abdomen: 'Normal', neurological: 'Normal', extremities: 'Normal' },
      accessEvaluation: { infection: 'Absent', bruit: 'Present', thrill: 'Present' },
      laboratoryReview: { anemiaManagement: 'At goal', boneMineralDisease: 'Controlled', nutrition: 'Adequate', vaccination: 'Up to date', cancerScreening: 'Up to date', cardiovascularReview: 'Normal' },
    },
    doctorComments: 'Routine monthly physician round. Patient stable.',
  },
};

export const TEMPLATE_NAMES = Object.keys(ROUND_TEMPLATES);
