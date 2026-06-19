import StatusBadge from '../ui/StatusBadge';
import { dateOnly, money, personName } from '../../utils/format';

const value = (v) => (v === undefined || v === null || v === '' ? '-' : String(v));
const yesNo = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

function InfoGrid({ items }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-1 break-words font-semibold text-slate-800">{value(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

export default function PatientBioPanel({ patient, claims = [], compact = false }) {
  if (!patient) return null;

  const insurance = patient.insurance || {};
  const medical = patient.medicalHistory || {};
  const emergency = patient.emergencyContact || {};
  const paidClaims = claims.filter((c) => c.status === 'paid');
  const claimTotal = claims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const paidTotal = paidClaims.reduce((sum, c) => sum + Number(c.paymentAmount || c.amount || 0), 0);
  const careFlags = Array.isArray(insurance.careCoordinationFlags)
    ? insurance.careCoordinationFlags.join(', ')
    : insurance.careCoordinationFlags;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100">Patient Bio Data</p>
              <h2 className="mt-1 text-2xl font-bold">{personName(patient)}</h2>
              <p className="text-sm text-blue-50">{patient.mrn} • {patient.phone || 'No phone'} • {patient.address || 'No address'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{patient.status || 'active'}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">Insurance: {insurance.approvalStatus || 'not_submitted'}</span>
            </div>
          </div>
        </div>
        <div className="p-5">
          <InfoGrid
            items={[
              { label: 'MRN', value: patient.mrn },
              { label: 'Full Name', value: personName(patient) },
              { label: 'DOB', value: dateOnly(patient.dob) },
              { label: 'Gender', value: patient.gender },
              { label: 'Phone', value: patient.phone },
              { label: 'Address', value: patient.address },
              { label: 'Referral Source', value: patient.referralSource },
              { label: 'Emergency Name', value: emergency.name },
              { label: 'Emergency Relation', value: emergency.relation },
              { label: 'Emergency Phone', value: emergency.phone },
            ]}
          />
        </div>
      </section>

      {!compact && (
        <>
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold">Medical Information</h3>
              <StatusBadge status={patient.status || 'active'} />
            </div>
            <InfoGrid
              items={[
                { label: 'Diagnosis', value: medical.diagnosis },
                { label: 'Dialysis Frequency', value: medical.dialysisFrequency },
                { label: 'Access Type', value: medical.accessType },
                { label: 'Allergies', value: Array.isArray(medical.allergies) ? medical.allergies.join(', ') : medical.allergies },
                { label: 'Medical Notes', value: medical.notes },
              ]}
            />
          </section>

          <section className="card p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">Insurance / Payer Details</h3>
                <p className="text-xs text-slate-500">Used by admin, biller, nurse, social worker and insurance teams.</p>
              </div>
              <StatusBadge status={insurance.approvalStatus || insurance.coverageStatus || 'not_submitted'} />
            </div>
            <InfoGrid
              items={[
                { label: 'Insurance / Payer', value: insurance.providerName || insurance.payerName },
                { label: 'Member ID', value: insurance.memberId },
                { label: 'Policy Number', value: insurance.policyNumber },
                { label: 'Group Number', value: insurance.groupNumber },
                { label: 'Coverage Status', value: insurance.coverageStatus || insurance.approvalStatus },
                { label: 'Plan Type', value: insurance.planType },
                { label: 'IPA / Medical Group', value: insurance.ipaMedicalGroup },
                { label: 'PCP Name', value: insurance.pcpName },
                { label: 'Dialysis Coverage', value: insurance.dialysisCoverage },
                { label: 'Authorization Required', value: yesNo(insurance.authorizationRequired) },
                { label: 'Transportation Benefits', value: insurance.transportationBenefits },
                { label: 'Deductible', value: insurance.deductible ? `Rs ${money(insurance.deductible)}` : '-' },
                { label: 'Coinsurance', value: insurance.coinsurance },
                { label: 'OOP Max', value: insurance.oopMax ? `Rs ${money(insurance.oopMax)}` : '-' },
                { label: 'Care Coordination Flags', value: careFlags },
                { label: 'Source File', value: insurance.sourceFile },
                { label: 'Approval Reference', value: insurance.approvalReference },
                { label: 'Valid From', value: dateOnly(insurance.approvalValidFrom) },
                { label: 'Valid To', value: dateOnly(insurance.approvalValidTo) },
                { label: 'Rejection Reason', value: insurance.rejectionReason },
              ]}
            />
          </section>

          <section className="card p-5">
            <h3 className="mb-4 font-bold">Payment Snapshot</h3>
            <InfoGrid
              items={[
                { label: 'Total Claims', value: claims.length },
                { label: 'Paid Claims', value: paidClaims.length },
                { label: 'Claimed Amount', value: `Rs ${money(claimTotal)}` },
                { label: 'Paid Amount', value: `Rs ${money(paidTotal)}` },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
