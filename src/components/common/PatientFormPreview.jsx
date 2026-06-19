import { insuranceCategories } from './InsuranceSectionFields';

const val = (v) => (v === undefined || v === null || v === '' ? '-' : String(v));
const yesNo = (v) => (v === undefined || v === null || v === '' ? '-' : v === true || v === 'true' ? 'Yes' : 'No');

function Row({ items }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="font-bold text-slate-800 break-words">{val(value)}</p>
        </div>
      ))}
    </div>
  );
}

function InsurancePreview({ title, data }) {
  if (!data) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-extrabold text-slate-950">{title}</h3>
      <Row items={[
        ['Provider', data.providerName], ['Payer', data.payerName], ['Category', data.insuranceCategory],
        ['Member ID', data.memberId], ['Policy', data.policyNumber], ['Group', data.groupNumber],
        ['Subscriber', data.subscriberName], ['Plan', data.planType], ['Effective Date', data.effectiveDate],
        ['Authorization Required', yesNo(data.authorizationRequired)], ['Referral Required', yesNo(data.referralRequired)],
        ['Notes', data.notes],
      ]} />
    </section>
  );
}

export default function PatientFormPreview({ form, documentFile, documentType }) {
  if (!form) return null;
  const med = form.medicalHistory || {};
  const reg = form.registration || {};
  const ins = form.insurance || {};
  const home = form.homeFacility || {};
  const pType = form.patientType || {};
  const iForm = form.insuranceForm || {};

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">1. Basic Information</h3>
        <Row items={[
          ['First Name', form.firstName], ['Last Name', form.lastName], ['Date of Birth', form.dob],
          ['Gender', form.gender], ['Phone', form.phone], ['Email', form.email],
          ['Address', form.address], ['City', form.city], ['State', form.state], ['Zip', form.zip],
          ['Referral Source', form.referralSource], ['Hospital', form.hospital],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">2. Patient Type</h3>
        <Row items={[
          ['New Patient', yesNo(pType.newPatient)], ['Transfer Patient', yesNo(pType.transferPatient)],
          ['Transient Patient', yesNo(pType.transientPatient)], ['Current Patient', yesNo(pType.currentPatient)],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">3. Home Facility</h3>
        <Row items={[
          ['Facility Name', home.facilityName], ['Facility Phone', home.facilityPhone], ['Facility Fax', home.facilityFax],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">4. Emergency Contact</h3>
        <Row items={[
          ['Contact Name', form.emergencyContact?.name], ['Relation', form.emergencyContact?.relation], ['Phone', form.emergencyContact?.phone],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">5. Medical History</h3>
        <Row items={[
          ['Diagnosis', med.diagnosis], ['Dialysis Frequency', med.dialysisFrequency],
          ['Allergies', med.allergies], ['Access Type', med.accessType],
          ['Post Weight', med.postWeight], ['Height', med.height], ['Diabetic', med.diabetic],
          ['Renal Failure Due To Accident', med.renalFailureDueToAccident],
          ['Had Dialysis Before', med.hadDialysisBefore],
          ['Previous Dialysis Location', med.previousDialysisLocation],
          ['Previous Dialysis Date', med.previousDialysisDate],
          ['Notes', med.notes],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">6. Registration / Admission</h3>
        <Row items={[
          ['Facility', reg.facility], ['Admission Date', reg.admissionDate], ['First Dialysis', reg.firstDialysis],
          ['Attending Physician', reg.attendingPhysician], ['Medical Record Number', reg.medicalRecordNumber],
          ['SSN', reg.ssn ? '•••-••-' + String(reg.ssn).slice(-4) : '-'],
          ['Marital Status', reg.maritalStatus],
          ['Spouse SSN', reg.spouseSsn ? '•••-••-' + String(reg.spouseSsn).slice(-4) : '-'],
          ['Religion', reg.religion], ['Secondary Payer Address', reg.secondaryPayerAddress],
          ['Patient Signature', reg.patientSignature], ['Patient Signature Date', reg.patientSignatureDate],
          ['Policy Holder Signature', reg.policyHolderSignature], ['Policy Holder Signature Date', reg.policyHolderSignatureDate],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">7. Insurance Information</h3>
        <Row items={[
          ['Clinic Name', iForm.clinicName], ['Form Status', iForm.formStatus], ['Approval Status', iForm.approvalStatus],
          ['Approval Reference', iForm.approvalReference], ['Valid From', iForm.approvalValidFrom], ['Valid To', iForm.approvalValidTo],
          ['Due Date', iForm.dueDate], ['Rejection Reason', iForm.rejectionReason],
          ['Quick Insurance / Payer', ins.providerName], ['Quick Member ID', ins.memberId],
          ['Quick Policy Number', ins.policyNumber], ['Quick Coverage Status', ins.coverageStatus],
          ['Insurance Expiry (dashboard)', ins.expiryDate],
        ]} />
      </section>

      <InsurancePreview title="Primary Insurance" data={iForm.primaryInsurance} />
      <InsurancePreview title="Secondary Insurance" data={iForm.secondaryInsurance} />
      <InsurancePreview title="Third Insurance" data={iForm.thirdInsurance} />

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">8. Billing Approval</h3>
        <Row items={[
          ['Billing Dept Approval Signature', iForm.billingDeptApprovalSignature],
          ['Billing Dept Approval Date', iForm.billingDeptApprovalDate],
          ['Comments / Risk Notes', iForm.comments],
        ]} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">9. Documents</h3>
        {documentFile ? (
          <div className="rounded-2xl border p-3 text-sm">
            <p><b>{documentFile.name}</b> ({(documentFile.size / 1024).toFixed(1)} KB)</p>
            <p className="text-slate-500">Category: {documentType}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No document attached yet.</p>
        )}
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-extrabold text-slate-950">10. System Fields</h3>
        <Row items={[
          ['Assigned Social Worker', form.assignedSocialWorker || 'Unassigned'],
          ['Patient Status', form.status || 'active'],
        ]} />
      </section>
    </div>
  );
}