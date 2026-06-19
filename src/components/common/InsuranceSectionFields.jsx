import { TextField, SelectField, YesNo } from './FormFields';

export const insuranceCategories = ['', 'medicare_hmo', 'medical_hmo', 'commercial_other', 'health_plan', 'medical_group', 'other'];

export const emptyInsurance = {
  providerName: '',
  payerName: '',
  insuranceCategory: 'other',
  policyNumber: '',
  groupNumber: '',
  memberId: '',
  subscriberName: '',
  planType: '',
  healthPlanName: '',
  medicalGroupName: '',
  insuranceAddress: '',
  insurancePhone: '',
  insuranceRepName: '',
  dateContacted: '',
  effectiveDate: '',
  billingAddress: '',
  coPayRequired: false,
  coPayAmount: '',
  deductibleRequired: false,
  deductibleAmount: '',
  deductibleMet: false,
  deductibleMetAmount: '',
  oopMaxRequired: false,
  oopMaxAmount: '',
  oopMaxMet: false,
  oopMaxMetAmount: '',
  lifetimeMaxRequired: false,
  lifetimeMaxLimit: '',
  lifetimeMaxUsed: '',
  isFacilityContracted: false,
  inNetworkBenefitAmount: '',
  inNetworkPaymentToProvider: false,
  outOfNetworkBenefitAmount: '',
  outOfNetworkPaymentToProvider: false,
  authorizationRequired: false,
  referralRequired: false,
  notes: '',
};

export function cleanInsurance(section = {}) {
  const dateValue = (v) => (v ? String(v).slice(0, 10) : '');
  const merged = { ...emptyInsurance, ...section };
  if (!insuranceCategories.includes(merged.insuranceCategory)) merged.insuranceCategory = 'other';
  return { ...merged, dateContacted: dateValue(merged.dateContacted), effectiveDate: dateValue(merged.effectiveDate) };
}

export function InsuranceSection({ title, data, onChange, full = false }) {
  const set = (field, value) => onChange({ ...data, [field]: value });
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-slate-950">{title}</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{data?.insuranceCategory || 'insurance'}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Provider Name" value={data.providerName} onChange={(v) => set('providerName', v)} />
        <TextField label="Payer Name" value={data.payerName} onChange={(v) => set('payerName', v)} />
        <SelectField label="Insurance Category" value={data.insuranceCategory} onChange={(v) => set('insuranceCategory', v || 'other')} options={insuranceCategories} />
        <TextField label="Policy Number" value={data.policyNumber} onChange={(v) => set('policyNumber', v)} />
        <TextField label="Group Number" value={data.groupNumber} onChange={(v) => set('groupNumber', v)} />
        <TextField label="Member ID" value={data.memberId} onChange={(v) => set('memberId', v)} />
        <TextField label="Subscriber Name" value={data.subscriberName} onChange={(v) => set('subscriberName', v)} />
        <TextField label="Plan Type" value={data.planType} onChange={(v) => set('planType', v)} />
        <TextField label="Effective Date" type="date" value={data.effectiveDate} onChange={(v) => set('effectiveDate', v)} />
        <YesNo label="Authorization Required" value={data.authorizationRequired} onChange={(v) => set('authorizationRequired', v)} />
        <YesNo label="Referral Required" value={data.referralRequired} onChange={(v) => set('referralRequired', v)} />
        <TextField label="Notes" value={data.notes} onChange={(v) => set('notes', v)} />
        {full && <>
          <TextField label="Health Plan Name" value={data.healthPlanName} onChange={(v) => set('healthPlanName', v)} />
          <TextField label="Medical Group Name" value={data.medicalGroupName} onChange={(v) => set('medicalGroupName', v)} />
          <TextField label="Insurance Phone" value={data.insurancePhone} onChange={(v) => set('insurancePhone', v)} />
          <TextField label="Insurance Rep Name" value={data.insuranceRepName} onChange={(v) => set('insuranceRepName', v)} />
          <TextField label="Date Contacted" type="date" value={data.dateContacted} onChange={(v) => set('dateContacted', v)} />
          <YesNo label="Co-Pay Required" value={data.coPayRequired} onChange={(v) => set('coPayRequired', v)} />
          <TextField label="Co-Pay Amount" value={data.coPayAmount} onChange={(v) => set('coPayAmount', v)} />
          <YesNo label="Deductible Required" value={data.deductibleRequired} onChange={(v) => set('deductibleRequired', v)} />
          <TextField label="Deductible Amount" value={data.deductibleAmount} onChange={(v) => set('deductibleAmount', v)} />
          <YesNo label="Deductible Met" value={data.deductibleMet} onChange={(v) => set('deductibleMet', v)} />
          <TextField label="Deductible Met Amount" value={data.deductibleMetAmount} onChange={(v) => set('deductibleMetAmount', v)} />
          <YesNo label="OOP Max Required" value={data.oopMaxRequired} onChange={(v) => set('oopMaxRequired', v)} />
          <TextField label="OOP Max Amount" value={data.oopMaxAmount} onChange={(v) => set('oopMaxAmount', v)} />
          <YesNo label="OOP Max Met" value={data.oopMaxMet} onChange={(v) => set('oopMaxMet', v)} />
          <TextField label="OOP Max Met Amount" value={data.oopMaxMetAmount} onChange={(v) => set('oopMaxMetAmount', v)} />
          <YesNo label="Lifetime Max Required" value={data.lifetimeMaxRequired} onChange={(v) => set('lifetimeMaxRequired', v)} />
          <TextField label="Lifetime Max Limit" value={data.lifetimeMaxLimit} onChange={(v) => set('lifetimeMaxLimit', v)} />
          <TextField label="Lifetime Max Used" value={data.lifetimeMaxUsed} onChange={(v) => set('lifetimeMaxUsed', v)} />
          <YesNo label="Facility Contracted" value={data.isFacilityContracted} onChange={(v) => set('isFacilityContracted', v)} />
          <TextField label="In-Network Benefit" value={data.inNetworkBenefitAmount} onChange={(v) => set('inNetworkBenefitAmount', v)} />
          <YesNo label="Payment To Provider" value={data.inNetworkPaymentToProvider} onChange={(v) => set('inNetworkPaymentToProvider', v)} />
          <TextField label="Out-of-Network Benefit" value={data.outOfNetworkBenefitAmount} onChange={(v) => set('outOfNetworkBenefitAmount', v)} />
          <YesNo label="OON Payment To Provider" value={data.outOfNetworkPaymentToProvider} onChange={(v) => set('outOfNetworkPaymentToProvider', v)} />
          <div className="md:col-span-3"><label className="label">Insurance Address</label><textarea className="input min-h-20" value={data.insuranceAddress || ''} onChange={(e) => set('insuranceAddress', e.target.value)} /></div>
          <div className="md:col-span-3"><label className="label">Billing Address</label><textarea className="input min-h-20" value={data.billingAddress || ''} onChange={(e) => set('billingAddress', e.target.value)} /></div>
        </>}
      </div>
    </section>
  );
}