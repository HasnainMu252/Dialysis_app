import api from './axios';

export const dialysisPrescriptionApi = {
  getActive: (idOrMrn) => api.get(`/patients/${idOrMrn}/dialysis-prescription`),
  history: (idOrMrn) => api.get(`/patients/${idOrMrn}/dialysis-prescription/history`),
  save: (idOrMrn, body) => api.post(`/patients/${idOrMrn}/dialysis-prescription`, body),
  activePatientIds: () => api.get('/dialysis-prescriptions/active-patient-ids'),
};

/* Option sets from the hemodialysis order form. "Other" reveals a free-text field. */
export const RX_OPTIONS = {
  frequency: ['Once', 'Every Mon-Wed-Fri', 'Every Tue-Thu-Sat'],
  duration: ['2 Hours', '2.5 Hours', '3 Hours', '3.5 Hours', '4 Hours', 'More than 4 Hours'],
  bathOrderType: ['Bath', 'Non-Bath'],
  bath: ['1K/2.5Ca', '2K/2.0Ca', '2K/3Ca', '2.0K/2.5Ca', '3K/2.5Ca', '4K/2.5Ca', 'Other'],
  bicarb: ['35 mEq', 'Other'],
  sodium: ['138 mEq', 'Other'],
  sodiumVariation: ['None', 'Step', 'Linear', 'Exponential'],
  dialyzer: ['F160', 'F180', 'F200', 'F8', 'F5', 'F3', 'NE-15H', 'NE-17H', 'NE-19H', 'FX60', 'FX80', 'FX100', 'Other'],
  temperature: ['35', '36', '37'],
  bloodFlowRate: ['200', '250', '300', '350', '400', '450', 'Other'],
  dialysateFlowRate: ['500', '600', '700', '800', 'Other'],
  fluidRemoval: ['0 Litres', '1 Litre', '2 Litres', '3 Litres', '4 Litres', 'Other'],
  tubing: ['2.3 mm', '4.8 mm', '6.5 mm', '8 mm', 'Other'],
  needleSize: ['15 gauge', '16 gauge', '17 gauge'],
  accessSite: ['AVF', 'AVG', 'Dialysis Catheter', 'Other'],
  yesNo: ['Yes', 'No'],
};

/* Field groups for rendering the read-only viewer. */
export const RX_VIEW_GROUPS = [
  { title: 'Schedule', fields: [['frequency', 'Frequency'], ['duration', 'Duration']] },
  { title: 'Dialysate', fields: [['bathOrderType', 'Bath Order'], ['bath', 'Bath'], ['bicarb', 'Bicarb'], ['sodium', 'Na+'], ['sodiumVariation', 'Na+ Variation'], ['sodiumModeling', 'Na+ Modeling'], ['temperature', 'Temperature (C)']] },
  { title: 'Circuit', fields: [['dialyzer', 'Dialyzer'], ['bloodFlowRate', 'Blood Flow (mL/min)'], ['dialysateFlowRate', 'Dialysate Flow (mL/min)'], ['tubing', 'Tubing'], ['needleSize', 'Needle Size']] },
  { title: 'Treatment', fields: [['fluidRemoval', 'Dry Weight / Fluid Removal'], ['accessSite', 'Access Site'], ['minimumSystolic', 'Keep Systolic Above (mmHg)'], ['abnormalPotassium', 'Abnormal Serum K+'], ['abnormalSodium', 'Abnormal Serum Na+']] },
];
