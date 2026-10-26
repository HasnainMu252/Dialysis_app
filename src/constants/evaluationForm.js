/*
 * Config-driven physician evaluation form (Weekly Evaluation + Monthly Round),
 * ported from the approved HTML template. Each form is a list of sections; each
 * section has items. Item types:
 *   sub      – subheading
 *   ta       – labelled textarea { name, label, def }
 *   access   – vascular access: 4 radios + the matching detail textarea
 *   struct   – structured box with a grid of small inputs
 *   vaccines – vaccination record (4 checkable rows with date + duration)
 *   cvtests  – cardiovascular tests (echo + stress, checkable with date + notes)
 * The whole form serialises to a flat `fields` object keyed by `name`.
 */

export const ACCESS_OPTIONS = [
  { value: 'permacath', label: 'Permacath' },
  { value: 'fistula', label: 'AV Fistula' },
  { value: 'graft', label: 'AV Graft' },
  { value: 'none', label: 'None / N/A' },
];

export const VACCINES = [
  { key: 'hepatitis_b', label: 'Hepatitis B' },
  { key: 'influenza', label: 'Influenza / Flu' },
  { key: 'pneumococcal', label: 'Pneumococcal / Pneumovax' },
  { key: 'covid', label: 'COVID-19' },
];

// ---- WEEKLY ----------------------------------------------------------------
export const WEEKLY_SECTIONS = [
  {
    title: '01 · Subjective & Review of Systems',
    items: [
      { t: 'ta', name: 'weekly_general', label: 'General', def: 'No complaints or new health concerns reported.' },
      { t: 'ta', name: 'weekly_at_home_respiratory', label: 'At Home — Respiratory', def: 'Denies shortness of breath, PND, and orthopnea.' },
      { t: 'ta', name: 'weekly_at_home_infection', label: 'At Home — Infection', def: 'Denies cough, fever, and chills.' },
      { t: 'ta', name: 'weekly_at_home_cardiac', label: 'At Home — Cardiac', def: 'Denies chest pain and palpitations.' },
      { t: 'ta', name: 'weekly_during_post_dialysis', label: 'During / Post Dialysis', def: 'No dizziness, chest pain, palpitations, diaphoresis, cramps, nausea, or vomiting.' },
    ],
  },
  {
    title: '02 · Physical Examination',
    items: [
      { t: 'ta', name: 'weekly_sheent', label: 'SHEENT', def: 'Normal examination.' },
      { t: 'ta', name: 'weekly_lungs', label: 'Lungs', def: 'Clear on auscultation.' },
      { t: 'ta', name: 'weekly_cardiac', label: 'Cardiac', def: 'Regular rate and rhythm (RRR). SEM absent.' },
      { t: 'ta', name: 'weekly_abdomen', label: 'Abdomen', def: 'Soft and non-tender.' },
      { t: 'ta', name: 'weekly_neurological', label: 'Neurological', def: 'Alert and oriented. UE neuropathy absent; LE deficit absent; Charcot foot absent.' },
      { t: 'ta', name: 'weekly_extremities', label: 'Extremities', def: 'No edema. Distal pulses intact. No ulcers.' },
    ],
  },
  {
    title: '03 · Vascular Access',
    items: [
      {
        t: 'access', name: 'weekly_access_type',
        details: {
          permacath: { name: 'weekly_permacath', label: 'Permacath', def: 'No infection or discharge at the entry site.' },
          fistula: { name: 'weekly_av_fistula', label: 'AV Fistula', def: 'No puncture-site infection, pseudoaneurysm, or ulceration. Good distal flow, no steal, and no motor or sensory deficit.' },
          graft: { name: 'weekly_av_graft', label: 'AV Graft', def: 'Good bruit, mature graft, no edema, and no steal symptoms.' },
        },
      },
    ],
  },
  {
    title: '04 · Labs & Treatment',
    items: [
      { t: 'ta', name: 'weekly_anemia', label: 'Anemia', def: 'EPO and iron therapy reviewed; adequate.' },
      { t: 'ta', name: 'weekly_bone_mineral_calcium', label: 'Bone Mineral — Calcium', def: 'Calcium level and therapy reviewed; appropriate.' },
      { t: 'ta', name: 'weekly_bone_mineral_phosphorus', label: 'Bone Mineral — Phosphorus', def: 'Phosphorus stable; phosphorus level adequate. Phosphorus binder therapy reviewed.' },
      { t: 'ta', name: 'weekly_bone_mineral_pth', label: 'Bone Mineral — PTH', def: 'PTH at goal; phosphorus binder therapy reviewed as applicable.' },
      { t: 'ta', name: 'weekly_nutrition', label: 'Nutrition', def: 'Albumin within normal/target range; nutritional status adequate.' },
      { t: 'ta', name: 'weekly_dialysis_adequacy', label: 'Dialysis Adequacy', def: 'Kt/V adequate.' },
      { t: 'ta', name: 'weekly_dry_weight_uf', label: 'Dry Weight / UF', def: 'Dry weight and ultrafiltration appropriate.' },
      { t: 'ta', name: 'weekly_blood_pressure', label: 'Blood Pressure', def: 'Pre-dialysis: good. Intradialytic: good. Post-dialysis: good.' },
      { t: 'ta', name: 'weekly_neurological_well_being', label: 'Neurological Well-Being', def: 'Stable. No neurological deficit noted.' },
      { t: 'ta', name: 'weekly_transplant', label: 'Kidney Transplant Evaluation', def: 'Evaluation up to date.' },
      {
        t: 'struct', title: 'Kidney Transplant — Details',
        grid: [
          { name: 'weekly_transplant_date', label: 'Date', type: 'date' },
          { name: 'weekly_transplant_seen', label: 'Seen / Evaluated By', type: 'text', placeholder: 'Name or status' },
          { name: 'weekly_transplant_location', label: 'Location', type: 'text', placeholder: 'Hospital / transplant center' },
        ],
        comments: { name: 'weekly_transplant_comments', label: 'Comments', placeholder: 'Enter transplant evaluation comments' },
      },
      { t: 'ta', name: 'weekly_vaccination', label: 'Vaccination', def: 'Vaccination status reviewed.' },
      { t: 'vaccines', prefix: 'weekly' },
      { t: 'ta', name: 'weekly_cancer_screening', label: 'Cancer Screening', def: 'Per primary medical doctor (PMD).' },
      { t: 'ta', name: 'weekly_cardiovascular_care', label: 'Cardiovascular Care', def: 'Per primary medical doctor (PMD).' },
      { t: 'cvtests', prefix: 'weekly' },
    ],
  },
  {
    title: '05 · Weekly Assessment & Plan',
    items: [
      { t: 'ta', name: 'weekly_assessment', label: 'Assessment', def: '' },
      { t: 'ta', name: 'weekly_plan_instructions', label: 'Plan / Instructions', def: '' },
    ],
  },
];

// ---- MONTHLY ---------------------------------------------------------------
export const MONTHLY_SECTIONS = [
  {
    title: '01 · Subjective & Review of Systems',
    items: [
      { t: 'ta', name: 'general', label: 'Patient Health Status', def: 'Patient reports no current health concerns.' },
      { t: 'sub', label: 'A · At Home' },
      { t: 'ta', name: 'respHome', label: 'Respiratory Symptoms', def: 'Denies shortness of breath, paroxysmal nocturnal dyspnea (PND), and orthopnea.' },
      { t: 'ta', name: 'infectHome', label: 'Infectious Symptoms', def: 'Denies dry cough, fever, and chills.' },
      { t: 'ta', name: 'cardiacHome', label: 'Cardiac Symptoms', def: 'Denies chest pain and palpitations.' },
      { t: 'sub', label: 'B · During / After Dialysis' },
      { t: 'ta', name: 'dialysisSymptoms', label: 'Dialysis Symptoms', def: 'Denies dizziness, chest pain, palpitations, diaphoresis, leg cramps, pain, nausea, and vomiting during or after dialysis.' },
    ],
  },
  {
    title: '02 · Physical Examination',
    items: [
      { t: 'ta', name: 'sheent', label: 'SHEENT / Neck', def: 'No rash, elevated JVP, infection, or lymphadenopathy.' },
      { t: 'ta', name: 'lungs', label: 'Lungs', def: 'Clear breath sounds with symmetric air movement in all lung fields.' },
      { t: 'ta', name: 'le', label: 'Lower Extremities', def: 'No edema at the end of dialysis. Good distal pulses. No foot or distal ulcers. Peripheral vascular evaluation reveals adequate pulses.' },
      { t: 'ta', name: 'ue', label: 'Upper Extremities', def: 'Adequate limb circulation. No neurological deficit.' },
      { t: 'ta', name: 'cardiac', label: 'Cardiac Examination', def: 'S1 and S2 regular. No gallop or rub. Systolic ejection murmur (SEM): absent.' },
      { t: 'ta', name: 'neuro', label: 'Neurological Examination', def: 'Alert and oriented; cognition adequate. Cranial nerves intact. No upper-extremity peripheral neuropathy, including distal to vascular access. No lower-extremity neurological deficit. Charcot foot absent.' },
      { t: 'ta', name: 'abdomen', label: 'Abdomen', def: 'Soft and non-tender. No ascites or palpable masses.' },
    ],
  },
  {
    title: '03 · Vascular Access Evaluation',
    items: [
      {
        t: 'access', name: 'monthly_access_type',
        details: {
          permacath: { name: 'permacath', label: 'Permacath', def: 'No local infection or discharge at or around the catheter entry site. Dressing intact; no surrounding skin infection.' },
          fistula: { name: 'fistula', label: 'AV Fistula', def: 'No infection at needle puncture sites. No pseudoaneurysm requiring surgical attention or ulceration suggesting rupture risk. Warm distal circulation, no steal symptoms, and no motor or sensory deficits.' },
          graft: { name: 'graft', label: 'AV Graft', def: 'Good bruit; graft mature. No steal symptoms or surrounding edema.' },
        },
      },
    ],
  },
  {
    title: '04 · Laboratory & Treatment Review',
    items: [
      { t: 'ta', name: 'anemia', label: '1. Anemia Management', def: 'Epogen/EPO and iron therapy reviewed; doses adequate.' },
      { t: 'ta', name: 'bone', label: '2. Bone / Mineral Management', def: 'Renal osteodystrophy reviewed. Calcium level and dosage appropriate. Phosphorus stable and adequate; phosphorus binder therapy reviewed. PTH at goal.' },
      { t: 'ta', name: 'monthly_phosphorus', label: 'Bone Mineral — Phosphorus', def: 'Phosphorus stable; phosphorus level adequate. Phosphorus binder therapy reviewed.' },
      { t: 'ta', name: 'monthly_pth', label: 'Bone Mineral — PTH', def: 'PTH at goal.' },
      { t: 'ta', name: 'nutrition', label: '3. Nutritional Status', def: 'Albumin within normal/target range; nutritional status adequate.' },
      { t: 'ta', name: 'adequacy', label: '4. Dialysis Adequacy', def: 'Kt/V adequate. Dialysis duration, dialyzer, blood flow (BF), and dialysate flow (DF) reviewed and appropriate.' },
      { t: 'ta', name: 'uf', label: '5. Dry Weight / Ultrafiltration', def: 'Dry weight and ultrafiltration prescription appropriate.' },
      { t: 'ta', name: 'bp', label: '6. Blood Pressure Control', def: 'Pre-dialysis: good. Intradialytic: good. Post-dialysis: good.' },
      { t: 'ta', name: 'wellbeing', label: '7. Neurological Well-Being', def: 'Stable. No neurological deficit noted.' },
      { t: 'ta', name: 'transplant', label: 'Kidney Transplant Evaluation', def: 'Transplant evaluation status reviewed and up to date.' },
      {
        t: 'struct', title: 'Kidney Transplant — Details',
        grid: [
          { name: 'monthly_transplant_date', label: 'Date', type: 'date' },
          { name: 'monthly_transplant_seen', label: 'Seen / Evaluated By', type: 'text', placeholder: 'Name or status' },
          { name: 'monthly_transplant_location', label: 'Location', type: 'text', placeholder: 'Hospital / transplant center' },
        ],
        comments: { name: 'monthly_transplant_comments', label: 'Comments', placeholder: 'Enter transplant evaluation comments' },
      },
      { t: 'ta', name: 'vaccines', label: '9. Vaccination', def: 'Vaccination status reviewed.' },
      { t: 'vaccines', prefix: 'monthly' },
      { t: 'ta', name: 'cancer', label: '10. Cancer Screening', def: 'Cancer screening per primary medical doctor (PMD).' },
      { t: 'ta', name: 'cv', label: '11. Cardiovascular Evaluation', def: "Cardiovascular evaluation per patient's PMD." },
      { t: 'cvtests', prefix: 'monthly' },
    ],
  },
  {
    title: '05 · Physician Assessment & Plan',
    items: [
      { t: 'ta', name: 'assessment', label: 'Assessment', def: '', placeholder: 'Enter assessment or changes from baseline…' },
      { t: 'ta', name: 'plan', label: 'Plan / Instructions', def: '', placeholder: 'Enter orders, clinical plan, and follow-up…' },
    ],
  },
];

export const sectionsFor = (kind) => (kind === 'weekly' ? WEEKLY_SECTIONS : MONTHLY_SECTIONS);

// Build the default `fields` object (prefilled text) for a kind.
export function defaultFields(kind) {
  const out = {};
  sectionsFor(kind).forEach((sec) => sec.items.forEach((it) => {
    if (it.t === 'ta') out[it.name] = it.def || '';
    if (it.t === 'access') {
      out[it.name] = 'not_selected';
      Object.values(it.details).forEach((d) => { out[d.name] = d.def || ''; });
    }
    if (it.t === 'struct') {
      it.grid.forEach((g) => { out[g.name] = ''; });
      if (it.comments) out[it.comments.name] = '';
    }
    if (it.t === 'vaccines') {
      VACCINES.forEach((v) => {
        out[`${it.prefix}_vaccine_${v.key}_given`] = false;
        out[`${it.prefix}_vaccine_${v.key}_date`] = '';
        out[`${it.prefix}_vaccine_${v.key}_duration`] = '';
      });
    }
    if (it.t === 'cvtests') {
      out[`${it.prefix}_echocardiogram_done`] = false;
      out[`${it.prefix}_echocardiogram_date`] = '';
      out[`${it.prefix}_echocardiogram_comments`] = '';
      out[`${it.prefix}_stress_test_done`] = false;
      out[`${it.prefix}_stress_test_date`] = '';
      out[`${it.prefix}_stress_test_comments`] = '';
    }
  }));
  return out;
}
