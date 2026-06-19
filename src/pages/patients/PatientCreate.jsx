import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { insuranceFormApi } from '../../api/insuranceFormApi';
import {
  TextField,
  SelectField,
  YesNo,
  CheckboxField,
  TextAreaField,
} from '../../components/common/FormFields';
import {
  InsuranceSection,
  emptyInsurance,
} from '../../components/common/InsuranceSectionFields';
import PatientFormPreview from '../../components/common/PatientFormPreview';

const initialForm = {
  firstName: '',
  lastName: '',
  dob: '1990-01-15',
  gender: 'male',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  referralSource: 'Hospital',
  hospital: '',

  patientType: {
    newPatient: true,
    transferPatient: false,
    transientPatient: false,
    currentPatient: false,
  },

  homeFacility: {
    facilityName: '',
    facilityPhone: '',
    facilityFax: '',
  },

  emergencyContact: {
    name: '',
    relation: '',
    phone: '',
  },

  medicalHistory: {
    diagnosis: 'CKD Stage 2',
    dialysisFrequency: '3 Times Weekly',
    allergies: 'Penicillin',
    accessType: 'AV Fistula',
    postWeight: '',
    height: '',
    diabetic: 'unknown',
    renalFailureDueToAccident: '',
    hadDialysisBefore: '',
    previousDialysisLocation: '',
    previousDialysisDate: '',
    notes: '',
  },

  registration: {
    facility: '',
    admissionDate: '',
    firstDialysis: '',
    attendingPhysician: '',
    medicalRecordNumber: '',
    ssn: '',
    maritalStatus: '',
    spouseSsn: '',
    religion: '',
    secondaryPayerAddress: '',
    patientSignature: '',
    patientSignatureDate: '',
    policyHolderSignature: '',
    policyHolderSignatureDate: '',
  },

  insurance: {
    providerName: 'ABC Insurance',
    payerName: '',
    policyNumber: 'POL12345',
    groupNumber: '',
    memberId: 'MEM12345',
    planType: '',
    coverageStatus: 'not_submitted',
    effectiveDate: '',
    expiryDate: '',
    authorizationRequired: false,
    authorizationNumber: '',
    notes: '',
  },

  createInsuranceForm: true,

  insuranceForm: {
    clinicName: 'AZUSA',
    admissionDate: '',
    formStatus: 'draft',
    approvalStatus: 'not_submitted',
    approvalReference: '',
    approvalValidFrom: '',
    approvalValidTo: '',
    dueDate: '',
    rejectionReason: '',
    primaryInsurance: { ...emptyInsurance, insuranceCategory: 'medicare_hmo' },
    secondaryInsurance: { ...emptyInsurance, insuranceCategory: 'medical_hmo' },
    thirdInsurance: { ...emptyInsurance, insuranceCategory: 'commercial_other' },
    billingDeptApprovalSignature: '',
    billingDeptApprovalDate: '',
    comments: '',
  },

  assignedSocialWorker: '',
  status: 'active',
};

const STEPS = [
  { key: 'basic', label: '1. Basic Info' },
  { key: 'type_facility', label: '2-3. Type & Facility' },
  { key: 'contact_medical', label: '4-5. Contact & Medical' },
  { key: 'registration', label: '6. Registration' },
  { key: 'insurance', label: '7. Insurance' },
  { key: 'billing', label: '8. Billing Approval' },
  { key: 'documents', label: '9. Documents' },
  { key: 'review', label: '10. Review & Submit' },
];

const emptyDocument = {
  file: null,
  type: 'insurance',
  documentDate: '',
  notes: '',
  previewUrl: '',
};

export default function PatientCreate() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([{ ...emptyDocument }]);

  const navigate = useNavigate();
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const setValue = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const setNested = (section, field, value) => {
    setForm((p) => ({
      ...p,
      [section]: {
        ...p[section],
        [field]: value,
      },
    }));
  };

  const setInsurance = (field, value) => {
    setForm((p) => ({
      ...p,
      insurance: {
        ...p.insurance,
        [field]: value,
      },
    }));
  };

  const setInsuranceForm = (field, value) => {
    setForm((p) => ({
      ...p,
      insuranceForm: {
        ...p.insuranceForm,
        [field]: value,
      },
    }));
  };

  const setInsuranceFormSection = (section, value) => {
    setForm((p) => ({
      ...p,
      insuranceForm: {
        ...p.insuranceForm,
        [section]: value,
      },
    }));
  };

  const setPatientType = (field, value) => {
    setForm((p) => ({
      ...p,
      patientType: {
        ...p.patientType,
        [field]: value,
      },
    }));
  };

  const validateBasic = () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      toast.error('First name, last name, phone and address are required');
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (step === 'basic' && !validateBasic()) return;

    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const goToStep = (key, idx) => {
    if (idx <= stepIndex) {
      setStep(key);
      return;
    }

    if (idx === stepIndex + 1) {
      if (step === 'basic' && !validateBasic()) return;
      setStep(key);
    }
  };

  const addDocumentRow = () => {
    setDocuments((prev) => [...prev, { ...emptyDocument }]);
  };

  const updateDocumentRow = (index, field, value) => {
    setDocuments((prev) =>
      prev.map((doc, i) => {
        if (i !== index) return doc;

        if (field === 'file') {
          if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);

          return {
            ...doc,
            file: value,
            previewUrl: value ? URL.createObjectURL(value) : '',
          };
        }

        return {
          ...doc,
          [field]: value,
        };
      })
    );
  };

  const removeDocumentRow = (index) => {
    setDocuments((prev) => {
      const doc = prev[index];

      if (doc?.previewUrl) {
        URL.revokeObjectURL(doc.previewUrl);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateBasic()) {
      setStep('basic');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob || undefined,
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        referralSource: form.referralSource,
        hospital: form.hospital,
        patientType: form.patientType,
        homeFacility: form.homeFacility,
        emergencyContact: form.emergencyContact,

        medicalHistory: {
          ...form.medicalHistory,
          allergies: form.medicalHistory.allergies
            ? form.medicalHistory.allergies
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
            : [],
          previousDialysisDate:
            form.medicalHistory.previousDialysisDate || undefined,
        },

        registration: {
          ...form.registration,
          admissionDate: form.registration.admissionDate || undefined,
          firstDialysis: form.registration.firstDialysis || undefined,
          patientSignatureDate:
            form.registration.patientSignatureDate || undefined,
          policyHolderSignatureDate:
            form.registration.policyHolderSignatureDate || undefined,
        },

        insurance: {
          providerName: form.insurance.providerName,
          payerName: form.insurance.payerName,
          policyNumber: form.insurance.policyNumber,
          groupNumber: form.insurance.groupNumber,
          memberId: form.insurance.memberId,
          planType: form.insurance.planType,
          coverageStatus: form.insurance.coverageStatus || 'not_submitted',
          effectiveDate: form.insurance.effectiveDate || undefined,
          expiryDate: form.insurance.expiryDate || undefined,
          authorizationRequired: Boolean(form.insurance.authorizationRequired),
          authorizationNumber: form.insurance.authorizationNumber,
          notes: form.insurance.notes,
        },

        assignedSocialWorker: form.assignedSocialWorker || undefined,
        status: form.status,
      };

      const patientRes = await patientApi.create(payload);
      const patient = patientRes.data?.data || patientRes.data;

      let insuranceForm = null;

      if (form.createInsuranceForm && patient?._id) {
        try {
          const insurancePayload = {
            ...form.insuranceForm,
            patientMrn: patient.mrn,
            admissionDate:
              form.insuranceForm.admissionDate ||
              form.registration.admissionDate ||
              undefined,
            approvalValidFrom:
              form.insuranceForm.approvalValidFrom || undefined,
            approvalValidTo: form.insuranceForm.approvalValidTo || undefined,
            dueDate: form.insuranceForm.dueDate || undefined,
            billingDeptApprovalDate:
              form.insuranceForm.billingDeptApprovalDate || undefined,
          };

          const insuranceRes = await insuranceFormApi.createForPatient(
            patient._id,
            insurancePayload
          );

          insuranceForm = insuranceRes.data?.data || insuranceRes.data;
        } catch (err) {
          toast.error(
            err?.response?.data?.message ||
              'Patient saved, but insurance form was not created'
          );
        }
      }

      const uploadDocs = documents.filter((doc) => doc.file);

      if (uploadDocs.length && insuranceForm?._id) {
        try {
          for (const doc of uploadDocs) {
            await insuranceFormApi.uploadDocuments(insuranceForm._id, {
              files: [doc.file],
              name: doc.type,
              documentDate: doc.documentDate || undefined,
              notes: doc.notes,
            });
          }
        } catch (err) {
          toast.error(
            err?.response?.data?.message ||
              'Patient saved, but some documents were not uploaded'
          );
        }
      }

      if (uploadDocs.length && !insuranceForm?._id) {
        toast.error(
          'Patient saved, but documents were not uploaded because insurance form was not created'
        );
      }

      toast.success(
        `Patient created ${patient?.mrn ? `(${patient.mrn})` : ''}`
      );

      navigate(`/patients/${patient?.mrn || patient?._id}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Patient</h1>
          <p className="text-sm text-slate-500">
            MRN will be generated by backend. Full registration, insurance
            authorization, billing approval and documents in one flow.
          </p>
        </div>

        <Link to="/front-desk/patients" className="btn-light">
          Back to Patients
        </Link>
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goToStep(s.key, i)}
            className={step === s.key ? 'btn-primary' : 'btn-light'}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === 'basic' && (
        <section className="card p-5">
          <h2 className="mb-4 font-bold">1. Patient Basic Information</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="First Name *"
              value={form.firstName}
              onChange={(v) => setValue('firstName', v)}
              required
            />
            <TextField
              label="Last Name *"
              value={form.lastName}
              onChange={(v) => setValue('lastName', v)}
              required
            />
            <TextField
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(v) => setValue('dob', v)}
            />
            <SelectField
              label="Gender"
              value={form.gender}
              onChange={(v) => setValue('gender', v)}
              options={['male', 'female', 'other']}
            />
            <TextField
              label="Phone *"
              value={form.phone}
              onChange={(v) => setValue('phone', v)}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setValue('email', v)}
            />
            <TextField
              label="Address *"
              value={form.address}
              onChange={(v) => setValue('address', v)}
              required
            />
            <TextField
              label="City"
              value={form.city}
              onChange={(v) => setValue('city', v)}
            />
            <TextField
              label="State"
              value={form.state}
              onChange={(v) => setValue('state', v)}
            />
            <TextField
              label="Zip"
              value={form.zip}
              onChange={(v) => setValue('zip', v)}
            />
            <TextField
              label="Referral Source"
              value={form.referralSource}
              onChange={(v) => setValue('referralSource', v)}
            />
            <TextField
              label="Hospital"
              value={form.hospital}
              onChange={(v) => setValue('hospital', v)}
            />
          </div>
        </section>
      )}

      {step === 'type_facility' && (
        <>
          <section className="card p-5">
            <h2 className="mb-4 font-bold">2. Patient Type</h2>

            <div className="grid gap-3 md:grid-cols-4">
              <CheckboxField
                label="New Patient"
                checked={form.patientType.newPatient}
                onChange={(v) => setPatientType('newPatient', v)}
              />
              <CheckboxField
                label="Transfer Patient"
                checked={form.patientType.transferPatient}
                onChange={(v) => setPatientType('transferPatient', v)}
              />
              <CheckboxField
                label="Transient Patient"
                checked={form.patientType.transientPatient}
                onChange={(v) => setPatientType('transientPatient', v)}
              />
              <CheckboxField
                label="Current Patient"
                checked={form.patientType.currentPatient}
                onChange={(v) => setPatientType('currentPatient', v)}
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold">3. Home Facility</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Facility Name"
                value={form.homeFacility.facilityName}
                onChange={(v) =>
                  setNested('homeFacility', 'facilityName', v)
                }
              />
              <TextField
                label="Facility Phone"
                value={form.homeFacility.facilityPhone}
                onChange={(v) =>
                  setNested('homeFacility', 'facilityPhone', v)
                }
              />
              <TextField
                label="Facility Fax"
                value={form.homeFacility.facilityFax}
                onChange={(v) => setNested('homeFacility', 'facilityFax', v)}
              />
            </div>
          </section>
        </>
      )}

      {step === 'contact_medical' && (
        <>
          <section className="card p-5">
            <h2 className="mb-4 font-bold">4. Emergency Contact</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Contact Name"
                value={form.emergencyContact.name}
                onChange={(v) => setNested('emergencyContact', 'name', v)}
              />
              <TextField
                label="Relation"
                value={form.emergencyContact.relation}
                onChange={(v) => setNested('emergencyContact', 'relation', v)}
              />
              <TextField
                label="Phone"
                value={form.emergencyContact.phone}
                onChange={(v) => setNested('emergencyContact', 'phone', v)}
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold">5. Medical History</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Diagnosis"
                value={form.medicalHistory.diagnosis}
                onChange={(v) => setNested('medicalHistory', 'diagnosis', v)}
              />
              <TextField
                label="Dialysis Frequency"
                value={form.medicalHistory.dialysisFrequency}
                onChange={(v) =>
                  setNested('medicalHistory', 'dialysisFrequency', v)
                }
              />
              <TextField
                label="Access Type"
                value={form.medicalHistory.accessType}
                onChange={(v) => setNested('medicalHistory', 'accessType', v)}
              />
              <TextField
                label="Allergies comma separated"
                value={form.medicalHistory.allergies}
                onChange={(v) => setNested('medicalHistory', 'allergies', v)}
              />
              <TextField
                label="Post Weight"
                value={form.medicalHistory.postWeight}
                onChange={(v) => setNested('medicalHistory', 'postWeight', v)}
              />
              <TextField
                label="Height"
                value={form.medicalHistory.height}
                onChange={(v) => setNested('medicalHistory', 'height', v)}
              />
              <SelectField
                label="Diabetic"
                value={form.medicalHistory.diabetic}
                onChange={(v) => setNested('medicalHistory', 'diabetic', v)}
                options={['unknown', 'yes', 'no']}
              />
              <TextField
                label="Renal Failure Due To Accident"
                value={form.medicalHistory.renalFailureDueToAccident}
                onChange={(v) =>
                  setNested('medicalHistory', 'renalFailureDueToAccident', v)
                }
              />
              <TextField
                label="Had Dialysis Before"
                value={form.medicalHistory.hadDialysisBefore}
                onChange={(v) =>
                  setNested('medicalHistory', 'hadDialysisBefore', v)
                }
              />
              <TextField
                label="Previous Dialysis Location"
                value={form.medicalHistory.previousDialysisLocation}
                onChange={(v) =>
                  setNested('medicalHistory', 'previousDialysisLocation', v)
                }
              />
              <TextField
                label="Previous Dialysis Date"
                type="date"
                value={form.medicalHistory.previousDialysisDate}
                onChange={(v) =>
                  setNested('medicalHistory', 'previousDialysisDate', v)
                }
              />
              <TextAreaField
                label="Medical Notes"
                value={form.medicalHistory.notes}
                onChange={(v) => setNested('medicalHistory', 'notes', v)}
              />
            </div>
          </section>
        </>
      )}

      {step === 'registration' && (
        <section className="card p-5">
          <h2 className="mb-4 font-bold">6. Registration / Admission</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="Facility"
              value={form.registration.facility}
              onChange={(v) => setNested('registration', 'facility', v)}
            />
            <TextField
              label="Admission Date"
              type="date"
              value={form.registration.admissionDate}
              onChange={(v) => setNested('registration', 'admissionDate', v)}
            />
            <TextField
              label="First Dialysis Date"
              type="date"
              value={form.registration.firstDialysis}
              onChange={(v) => setNested('registration', 'firstDialysis', v)}
            />
            <TextField
              label="Attending Physician"
              value={form.registration.attendingPhysician}
              onChange={(v) =>
                setNested('registration', 'attendingPhysician', v)
              }
            />
            <TextField
              label="Medical Record Number"
              value={form.registration.medicalRecordNumber}
              onChange={(v) =>
                setNested('registration', 'medicalRecordNumber', v)
              }
            />
            <TextField
              label="SSN"
              value={form.registration.ssn}
              onChange={(v) => setNested('registration', 'ssn', v)}
            />
            <TextField
              label="Marital Status"
              value={form.registration.maritalStatus}
              onChange={(v) => setNested('registration', 'maritalStatus', v)}
            />
            <TextField
              label="Spouse SSN"
              value={form.registration.spouseSsn}
              onChange={(v) => setNested('registration', 'spouseSsn', v)}
            />
            <TextField
              label="Religion"
              value={form.registration.religion}
              onChange={(v) => setNested('registration', 'religion', v)}
            />
            <TextAreaField
              label="Secondary Payer Address"
              value={form.registration.secondaryPayerAddress}
              onChange={(v) =>
                setNested('registration', 'secondaryPayerAddress', v)
              }
            />
            <TextField
              label="Patient Signature"
              value={form.registration.patientSignature}
              onChange={(v) =>
                setNested('registration', 'patientSignature', v)
              }
            />
            <TextField
              label="Patient Signature Date"
              type="date"
              value={form.registration.patientSignatureDate}
              onChange={(v) =>
                setNested('registration', 'patientSignatureDate', v)
              }
            />
            <TextField
              label="Policy Holder Signature"
              value={form.registration.policyHolderSignature}
              onChange={(v) =>
                setNested('registration', 'policyHolderSignature', v)
              }
            />
            <TextField
              label="Policy Holder Signature Date"
              type="date"
              value={form.registration.policyHolderSignatureDate}
              onChange={(v) =>
                setNested('registration', 'policyHolderSignatureDate', v)
              }
            />
          </div>
        </section>
      )}

      {step === 'insurance' && (
        <section className="card space-y-5 p-5">
          <h2 className="font-bold">7. Insurance Information</h2>

          <div className="rounded-2xl bg-blue-50 p-4">
            <h3 className="mb-3 font-bold text-blue-900">
              Quick Insurance / Payer
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Provider Name"
                value={form.insurance.providerName}
                onChange={(v) => setInsurance('providerName', v)}
              />
              <TextField
                label="Payer Name"
                value={form.insurance.payerName}
                onChange={(v) => setInsurance('payerName', v)}
              />
              <TextField
                label="Policy Number"
                value={form.insurance.policyNumber}
                onChange={(v) => setInsurance('policyNumber', v)}
              />
              <TextField
                label="Group Number"
                value={form.insurance.groupNumber}
                onChange={(v) => setInsurance('groupNumber', v)}
              />
              <TextField
                label="Member ID"
                value={form.insurance.memberId}
                onChange={(v) => setInsurance('memberId', v)}
              />
              <TextField
                label="Plan Type"
                value={form.insurance.planType}
                onChange={(v) => setInsurance('planType', v)}
              />
              <SelectField
                label="Coverage Status"
                value={form.insurance.coverageStatus}
                onChange={(v) => setInsurance('coverageStatus', v)}
                options={[
                  'not_submitted',
                  'submitted',
                  'approved',
                  'rejected',
                  'expired',
                ]}
              />
              <TextField
                label="Effective Date"
                type="date"
                value={form.insurance.effectiveDate}
                onChange={(v) => setInsurance('effectiveDate', v)}
              />
              <TextField
                label="Expiry Date"
                type="date"
                value={form.insurance.expiryDate}
                onChange={(v) => setInsurance('expiryDate', v)}
              />
              <YesNo
                label="Authorization Required"
                value={form.insurance.authorizationRequired}
                onChange={(v) => setInsurance('authorizationRequired', v)}
              />
              <TextField
                label="Authorization Number"
                value={form.insurance.authorizationNumber}
                onChange={(v) => setInsurance('authorizationNumber', v)}
              />
              <TextAreaField
                label="Insurance Notes"
                value={form.insurance.notes}
                onChange={(v) => setInsurance('notes', v)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Full Insurance Authorization Form
              </h3>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.createInsuranceForm}
                  onChange={(e) =>
                    setValue('createInsuranceForm', e.target.checked)
                  }
                />
                Create insurance form
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Clinic Name"
                value={form.insuranceForm.clinicName}
                onChange={(v) => setInsuranceForm('clinicName', v)}
              />
              <SelectField
                label="Form Status"
                value={form.insuranceForm.formStatus}
                onChange={(v) => setInsuranceForm('formStatus', v)}
                options={['draft', 'submitted', 'approved', 'rejected', 'expired']}
              />
              <SelectField
                label="Approval Status"
                value={form.insuranceForm.approvalStatus}
                onChange={(v) => setInsuranceForm('approvalStatus', v)}
                options={[
                  'not_submitted',
                  'submitted',
                  'approved',
                  'rejected',
                  'expired',
                  'pending',
                ]}
              />
              <TextField
                label="Approval Reference"
                value={form.insuranceForm.approvalReference}
                onChange={(v) => setInsuranceForm('approvalReference', v)}
              />
              <TextField
                label="Approval Valid From"
                type="date"
                value={form.insuranceForm.approvalValidFrom}
                onChange={(v) => setInsuranceForm('approvalValidFrom', v)}
              />
              <TextField
                label="Approval Valid To"
                type="date"
                value={form.insuranceForm.approvalValidTo}
                onChange={(v) => setInsuranceForm('approvalValidTo', v)}
              />
              <TextField
                label="Due Date"
                type="date"
                value={form.insuranceForm.dueDate}
                onChange={(v) => setInsuranceForm('dueDate', v)}
              />
              <TextField
                label="Rejection Reason"
                value={form.insuranceForm.rejectionReason}
                onChange={(v) => setInsuranceForm('rejectionReason', v)}
              />
            </div>

            <div className="mt-5 space-y-4">
              <InsuranceSection
                title="Primary Insurance"
                full
                data={form.insuranceForm.primaryInsurance}
                onChange={(v) =>
                  setInsuranceFormSection('primaryInsurance', v)
                }
              />
              <InsuranceSection
                title="Secondary Insurance"
                data={form.insuranceForm.secondaryInsurance}
                onChange={(v) =>
                  setInsuranceFormSection('secondaryInsurance', v)
                }
              />
              <InsuranceSection
                title="Third Insurance"
                data={form.insuranceForm.thirdInsurance}
                onChange={(v) => setInsuranceFormSection('thirdInsurance', v)}
              />
            </div>
          </div>
        </section>
      )}

      {step === 'billing' && (
        <section className="card p-5">
          <h2 className="mb-4 font-bold">8. Billing Approval</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="Billing Dept Approval Signature"
              value={form.insuranceForm.billingDeptApprovalSignature}
              onChange={(v) =>
                setInsuranceForm('billingDeptApprovalSignature', v)
              }
            />
            <TextField
              label="Billing Dept Approval Date"
              type="date"
              value={form.insuranceForm.billingDeptApprovalDate}
              onChange={(v) =>
                setInsuranceForm('billingDeptApprovalDate', v)
              }
            />
            <TextAreaField
              label="Comments / Auth Risk / DOFR Risk"
              value={form.insuranceForm.comments}
              onChange={(v) => setInsuranceForm('comments', v)}
              placeholder="Auth Risk: High. DOFR Risk: Need billing review."
            />
          </div>
        </section>
      )}

      {step === 'documents' && (
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">9. Documents</h2>
              <p className="text-sm text-slate-500">
                Upload multiple documents using Insurance Form document API.
              </p>
            </div>

            <button type="button" className="btn-light" onClick={addDocumentRow}>
              + Add Document
            </button>
          </div>

          {!form.createInsuranceForm && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Enable “Create insurance form” in Insurance step before uploading
              documents.
            </p>
          )}

          <div className="space-y-4">
            {documents.map((doc, index) => (
              <div key={index} className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Document {index + 1}</h3>

                  {documents.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() => removeDocumentRow(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <SelectField
                    label="Document Type"
                    value={doc.type}
                    onChange={(v) => updateDocumentRow(index, 'type', v)}
                    options={[
                      'insurance',
                      'registration',
                      'authorization',
                      'lab',
                      'clinical',
                      'other',
                    ]}
                  />

                  <TextField
                    label="Document Date"
                    type="date"
                    value={doc.documentDate}
                    onChange={(v) =>
                      updateDocumentRow(index, 'documentDate', v)
                    }
                  />

                  <div>
                    <label className="label">File Upload</label>
                    <input
                      className="input"
                      type="file"
                      onChange={(e) =>
                        updateDocumentRow(
                          index,
                          'file',
                          e.target.files?.[0] || null
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-3">
                    <TextAreaField
                      label="Document Notes"
                      value={doc.notes}
                      onChange={(v) => updateDocumentRow(index, 'notes', v)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                {doc.file && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border p-3 text-sm">
                    <span className="font-medium">{doc.file.name}</span>

                    <span className="text-slate-500">
                      {(doc.file.size / 1024).toFixed(1)} KB
                    </span>

                    <a
                      className="btn-light"
                      href={doc.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>

                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => updateDocumentRow(index, 'file', null)}
                    >
                      Clear File
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 'review' && (
        <>
          <section className="card p-5">
            <h2 className="mb-2 font-bold">10. Review Before Submit</h2>
            <p className="text-sm text-slate-500">
              Check every section below. Use the step buttons above to go back
              and edit anything.
            </p>
          </section>

          <PatientFormPreview form={form} documents={documents} />
        </>
      )}

      <div className="flex justify-between">
        {stepIndex > 0 ? (
          <button type="button" className="btn-light" onClick={goBack}>
            ← Back
          </button>
        ) : (
          <span />
        )}

        {step !== 'review' ? (
          <button type="button" className="btn-primary" onClick={goNext}>
            Next →
          </button>
        ) : (
          <button disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Patient'}
          </button>
        )}
      </div>
    </form>
  );
}