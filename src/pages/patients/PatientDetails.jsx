import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, X } from 'lucide-react';

import { patientApi } from '../../api/patientApi';
import { insuranceFormApi } from '../../api/insuranceFormApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import { doctorApi } from '../../api/doctorApi';

import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import PatientBioPanel from '../../components/common/PatientBioPanel';
import EmptyState from '../../components/common/EmptyState';
import InsuranceFormPanel from '../../components/common/InsuranceFormPanel';
import PatientFormPreview from '../../components/common/PatientFormPreview';
import PdfViewer from '../../components/common/pdfViewer';
import { API_BASE_URL } from '../../constants';

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

import { dateOnly, fileUrl, money, personName } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

import {
  canCreateSchedule,
  canEditPatient,
  canUploadPatientDocuments,
  canAddDoctorRound,
  patientTabsForRole,
  isTabReadOnly,
} from '../../utils/permissions';

const dateInput = (value) => (value ? String(value).slice(0, 10) : '');

const cleanInsurance = (value = {}) => ({
  ...emptyInsurance,
  ...value,
});

const emptyInsuranceFormShape = {
  clinicName: '',
  admissionDate: '',
  formStatus: 'draft',
  approvalStatus: 'not_submitted',
  approvalReference: '',
  approvalValidFrom: '',
  approvalValidTo: '',
  dueDate: '',
  rejectionReason: '',
  primaryInsurance: { ...emptyInsurance },
  secondaryInsurance: { ...emptyInsurance },
  thirdInsurance: { ...emptyInsurance },
  billingDeptApprovalSignature: '',
  billingDeptApprovalDate: '',
  comments: '',
  documents: [],
};

const daysUntil = (value) => {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / 86400000);
};

const expiryClass = (days) => {
  if (days === null) return 'border-slate-200 bg-white text-slate-700';
  if (days < 0) return 'border-red-300 bg-red-100 text-red-800';
  if (days <= 15) return 'border-red-300 bg-red-50 text-red-700';
  if (days <= 30) return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-white text-slate-700';
};

const toEditable = (patient, insuranceForm) => ({
  firstName: patient?.firstName || '',
  lastName: patient?.lastName || '',
  dob: dateInput(patient?.dob),
  gender: patient?.gender || 'male',
  phone: patient?.phone || '',
  email: patient?.email || '',
  address: patient?.address || '',
  city: patient?.city || '',
  state: patient?.state || '',
  zip: patient?.zip || '',
  referralSource: patient?.referralSource || '',
  hospital: patient?.hospital || '',

  patientType: {
    newPatient: !!patient?.patientType?.newPatient,
    transferPatient: !!patient?.patientType?.transferPatient,
    transientPatient: !!patient?.patientType?.transientPatient,
    currentPatient: !!patient?.patientType?.currentPatient,
  },

  homeFacility: {
    facilityName: patient?.homeFacility?.facilityName || '',
    facilityPhone: patient?.homeFacility?.facilityPhone || '',
    facilityFax: patient?.homeFacility?.facilityFax || '',
  },

  emergencyContact: {
    name: patient?.emergencyContact?.name || '',
    relation: patient?.emergencyContact?.relation || '',
    phone: patient?.emergencyContact?.phone || '',
  },

  medicalHistory: {
    diagnosis: patient?.medicalHistory?.diagnosis || '',
    dialysisFrequency: patient?.medicalHistory?.dialysisFrequency || '',
    allergies: Array.isArray(patient?.medicalHistory?.allergies)
      ? patient.medicalHistory.allergies.join(', ')
      : '',
    accessType: patient?.medicalHistory?.accessType || '',
    notes: patient?.medicalHistory?.notes || '',
    postWeight: patient?.medicalHistory?.postWeight || '',
    height: patient?.medicalHistory?.height || '',
    diabetic: patient?.medicalHistory?.diabetic || 'unknown',
    renalFailureDueToAccident:
      patient?.medicalHistory?.renalFailureDueToAccident || '',
    hadDialysisBefore: patient?.medicalHistory?.hadDialysisBefore || '',
    previousDialysisLocation:
      patient?.medicalHistory?.previousDialysisLocation || '',
    previousDialysisDate: dateInput(
      patient?.medicalHistory?.previousDialysisDate
    ),
  },

  registration: {
    facility: patient?.registration?.facility || '',
    admissionDate: dateInput(patient?.registration?.admissionDate),
    firstDialysis: dateInput(patient?.registration?.firstDialysis),
    attendingPhysician: patient?.registration?.attendingPhysician || '',
    medicalRecordNumber:
      patient?.registration?.medicalRecordNumber || patient?.mrn || '',
    ssn: patient?.registration?.ssn || '',
    maritalStatus: patient?.registration?.maritalStatus || '',
    spouseSsn: patient?.registration?.spouseSsn || '',
    religion: patient?.registration?.religion || '',
    secondaryPayerAddress: patient?.registration?.secondaryPayerAddress || '',
    patientSignature: patient?.registration?.patientSignature || '',
    patientSignatureDate: dateInput(patient?.registration?.patientSignatureDate),
    policyHolderSignature: patient?.registration?.policyHolderSignature || '',
    policyHolderSignatureDate: dateInput(
      patient?.registration?.policyHolderSignatureDate
    ),
  },

  insurance: {
    providerName: patient?.insurance?.providerName || '',
    payerName: patient?.insurance?.payerName || '',
    policyNumber: patient?.insurance?.policyNumber || '',
    groupNumber: patient?.insurance?.groupNumber || '',
    memberId: patient?.insurance?.memberId || '',
    planType: patient?.insurance?.planType || '',
    coverageStatus: patient?.insurance?.coverageStatus || 'not_submitted',
    effectiveDate: dateInput(patient?.insurance?.effectiveDate),
    expiryDate: dateInput(patient?.insurance?.expiryDate),
    authorizationRequired: !!patient?.insurance?.authorizationRequired,
    authorizationNumber: patient?.insurance?.authorizationNumber || '',
    notes: patient?.insurance?.notes || '',
  },

  assignedSocialWorker:
    patient?.assignedSocialWorker?._id || patient?.assignedSocialWorker || '',
  status: patient?.status || 'active',

  insuranceForm: insuranceForm?._id
    ? {
        clinicName: insuranceForm.clinicName || '',
        admissionDate: dateInput(insuranceForm.admissionDate),
        formStatus: insuranceForm.formStatus || 'draft',
        approvalStatus: insuranceForm.approvalStatus || 'not_submitted',
        approvalReference: insuranceForm.approvalReference || '',
        approvalValidFrom: dateInput(insuranceForm.approvalValidFrom),
        approvalValidTo: dateInput(insuranceForm.approvalValidTo),
        dueDate: dateInput(insuranceForm.dueDate),
        rejectionReason: insuranceForm.rejectionReason || '',
        primaryInsurance: cleanInsurance(insuranceForm.primaryInsurance),
        secondaryInsurance: cleanInsurance(insuranceForm.secondaryInsurance),
        thirdInsurance: cleanInsurance(insuranceForm.thirdInsurance),
        billingDeptApprovalSignature:
          insuranceForm.billingDeptApprovalSignature || '',
        billingDeptApprovalDate: dateInput(
          insuranceForm.billingDeptApprovalDate
        ),
        comments: insuranceForm.comments || '',
        documents: insuranceForm.documents || [],
      }
    : { ...emptyInsuranceFormShape },
});

const toFileApiUrl = (url = '') => {
  const match = String(url).match(/\/uploads\/(.+)/);
  return match ? `${API_BASE_URL}/files/${match[1]}` : '';
};

const SessionHistoryCard = ({ session }) => {
  const [viewDoc, setViewDoc] = useState(null);
  const docs = session.documents || [];
  const ts = (d) => (d ? new Date(d).toLocaleString() : '—');
  return (
    <div className="card p-4 text-sm">
      <div className="flex justify-between gap-2">
        <div>
          <b>{dateOnly(session.completedAt || session.createdAt)}</b>
          <p className="text-xs text-slate-500">Session {session._id}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-3">
        <span>Created: <b className="text-slate-700">{ts(session.createdAt)}</b></span>
        <span>Started: <b className="text-slate-700">{ts(session.startedAt)}</b></span>
        <span>Completed: <b className="text-slate-700">{ts(session.completedAt)}</b></span>
      </div>

      <p className="mt-2 text-slate-700">{session.treatmentSummary || 'No treatment summary yet'}</p>

      {!!(session.vitals?.length || session.soapNotes?.length) && (
        <p className="mt-1 text-xs text-slate-500">{session.vitals?.length || 0} vitals • {session.soapNotes?.length || 0} SOAP notes</p>
      )}

      {!!docs.length && (
        <div className="mt-3 border-t pt-3">
          <p className="mb-2 text-xs font-bold uppercase text-slate-400">Documents ({docs.length})</p>
          <div className="flex flex-wrap gap-2">
            {docs.map((d, i) => (
              <button key={i} className="btn-light text-xs" onClick={() => setViewDoc(d)}>{d.name || `Document ${i + 1}`}</button>
            ))}
          </div>
        </div>
      )}

      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setViewDoc(null)}>
          <div className="h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2"><b className="text-sm">{viewDoc.name || 'Document'}</b><button onClick={() => setViewDoc(null)}><X size={18} /></button></div>
            <div className="h-[calc(80vh-44px)]"><PdfViewer apiUrl={toFileApiUrl(viewDoc.fileUrl)} downloadUrl={toFileApiUrl(viewDoc.fileUrl)} name={viewDoc.name} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PatientDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const allowEdit = canEditPatient(user?.role);
  const allowSchedule = canCreateSchedule(user?.role);
  const allowUploadDocs = canUploadPatientDocuments(user?.role);

  const [patient, setPatient] = useState(null);
  const [insuranceFormData, setInsuranceFormData] = useState(null);
  const [insuranceFormId, setInsuranceFormId] = useState(null);
  const [form, setForm] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [doctorCheckups, setDoctorCheckups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [previewMode, setPreviewMode] = useState(false);

  const [addingDocs, setAddingDocs] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docUpload, setDocUpload] = useState({
    files: [],
    name: '',
    documentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const nowDate = new Date();
  const emptyRound = {
    month: nowDate.getMonth() + 1,
    year: nowDate.getFullYear(),
    roundNumber: 1,
    checkupDate: nowDate.toISOString().slice(0, 10),
    nextFollowUpDate: '',
    status: 'completed',
    vitals: { bloodPressure: '', pulse: '', temperature: '', respiratoryRate: '', weight: '', oxygenSaturation: '' },
    soap: { subjective: '', objective: '', assessment: '', plan: '', doctorNotes: '' },
    documents: [],
    documentName: '',
    documentNotes: '',
  };
  const [showRoundForm, setShowRoundForm] = useState(searchParams.get('addRound') === '1');
  const [savingRound, setSavingRound] = useState(false);
  const [roundForm, setRoundForm] = useState(emptyRound);

  const updateRound = (path, value) => {
    setRoundForm((prev) => {
      const next = structuredClone(prev);
      const parts = path.split('.');
      let target = next;
      parts.slice(0, -1).forEach((part) => { target = target[part]; });
      target[parts.at(-1)] = value;
      return next;
    });
  };

  const submitRound = async (event) => {
    event.preventDefault();
    if (!patient?._id) return;
    setSavingRound(true);
    try {
      const body = {
        month: Number(roundForm.month),
        year: Number(roundForm.year),
        roundNumber: Number(roundForm.roundNumber),
        checkupDate: roundForm.checkupDate,
        nextFollowUpDate: roundForm.nextFollowUpDate || undefined,
        status: roundForm.status,
        vitals: roundForm.vitals,
        soap: roundForm.soap,
      };
      const res = await doctorApi.createCheckup(patient._id, body);
      const checkup = res.data?.data;
      if (checkup?._id && roundForm.documents?.length) {
        await doctorApi.uploadDocuments(checkup._id, {
          files: roundForm.documents,
          name: roundForm.documentName,
          notes: roundForm.documentNotes,
        });
      }
      toast.success('SOAP round saved');
      setRoundForm({ ...emptyRound, month: roundForm.month, year: roundForm.year });
      setShowRoundForm(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save SOAP round');
    } finally {
      setSavingRound(false);
    }
  };

  const load = async () => {
    setLoading(true);

    try {
      const res = await patientApi.get(id);
      const p = res.data?.data || res.data;

      let ins = null;

      try {
        const insuranceRes = await insuranceFormApi.getByPatient(p._id || p.mrn);
        ins = insuranceRes.data?.data || insuranceRes.data || null;
      } catch {
        ins = null;
      }

      setPatient(p);
      setInsuranceFormData(ins);
      setInsuranceFormId(ins?._id || null);
      setForm(toEditable(p, ins));

      const [scheduleRes, sessionRes, claimRes, doctorCheckupRes] = await Promise.allSettled([
        scheduleApi.byPatient(p.mrn),
        sessionApi.list({ patient: p._id }),
        billingApi.listClaims(),
        doctorApi.patientCheckups(p._id),
      ]);

      if (scheduleRes.status === 'fulfilled') {
        setSchedules(
          scheduleRes.value.data?.schedules ||
            scheduleRes.value.data?.data ||
            []
        );
      }

      if (sessionRes.status === 'fulfilled') {
        setSessions(sessionRes.value.data?.data || []);
      }

      if (claimRes.status === 'fulfilled') {
        setClaims(
          (claimRes.value.data?.data || []).filter(
            (c) => (c.patient?._id || c.patient) === p._id
          )
        );
      }

      if (doctorCheckupRes.status === 'fulfilled') {
        setDoctorCheckups(doctorCheckupRes.value.data?.data || []);
      } else {
        setDoctorCheckups([]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Patient not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const completed = useMemo(
    () => sessions.filter((s) => s.status === 'completed'),
    [sessions]
  );

  const activeSchedules = useMemo(
    () =>
      schedules.filter(
        (s) =>
          !['completed', 'cancelled', 'no_show'].includes(
            String(s.status || '').toLowerCase()
          ) && dateOnly(s.date) >= new Date().toISOString().slice(0, 10)
      ),
    [schedules]
  );

  const doctorCheckupsByMonth = useMemo(() => {
    const grouped = {};

    doctorCheckups.forEach((checkup) => {
      const key = `${checkup.year || '-'}-${String(checkup.month || '').padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(checkup);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        }),
        rounds: items.sort((a, b) => Number(a.roundNumber || 0) - Number(b.roundNumber || 0)),
      }));
  }, [doctorCheckups]);

  const expiryDays = daysUntil(
    patient?.insurance?.expiryDate ||
      insuranceFormData?.approvalValidTo ||
      insuranceFormData?.dueDate
  );

  const setValue = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setNested = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const setPatientType = (field, value) => {
    setForm((prev) => ({
      ...prev,
      patientType: {
        ...prev.patientType,
        [field]: value,
      },
    }));
  };

  const setInsuranceForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      insuranceForm: {
        ...prev.insuranceForm,
        [field]: value,
      },
    }));
  };

  const setInsuranceFormSection = (section, value) => {
    setForm((prev) => ({
      ...prev,
      insuranceForm: {
        ...prev.insuranceForm,
        [section]: value,
      },
    }));
  };

  const ensureInsuranceForm = async () => {
    if (insuranceFormId) return insuranceFormId;

    const insurancePayload = {
      ...form.insuranceForm,
      patientMrn: patient.mrn,
      admissionDate:
        form.insuranceForm.admissionDate ||
        form.registration.admissionDate ||
        undefined,
    };

    const res = await insuranceFormApi.createForPatient(
      patient._id,
      insurancePayload
    );

    const created = res.data?.data || res.data;

    setInsuranceFormData(created);
    setInsuranceFormId(created?._id || null);
    setForm(toEditable(patient, created));

    return created?._id;
  };

  const saveFullProfile = async () => {
    if (!allowEdit) return toast.error('Your role cannot edit patients');

    setSaving(true);

    try {
      const patientPayload = {
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
          allergies: String(form.medicalHistory?.allergies || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
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
          ...form.insurance,
          effectiveDate: form.insurance.effectiveDate || undefined,
          expiryDate: form.insurance.expiryDate || undefined,
          authorizationRequired: Boolean(
            form.insurance.authorizationRequired
          ),
        },

        assignedSocialWorker: form.assignedSocialWorker || undefined,
        status: form.status,
      };

      const patientRes = await patientApi.update(
        patient.mrn || patient._id,
        patientPayload
      );

      const updatedPatient = patientRes.data?.data || patientRes.data;

      const insuranceRes = insuranceFormId
        ? await insuranceFormApi.update(insuranceFormId, form.insuranceForm)
        : await insuranceFormApi.createForPatient(
            updatedPatient._id,
            form.insuranceForm
          );

      const updatedInsurance = insuranceRes.data?.data || insuranceRes.data;

      setPatient(updatedPatient);
      setInsuranceFormData(updatedInsurance);
      setInsuranceFormId(updatedInsurance?._id || insuranceFormId);
      setForm(toEditable(updatedPatient, updatedInsurance));

      toast.success('Patient profile updated');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const uploadInsuranceDocuments = async () => {
    if (!docUpload.files.length) {
      toast.error('Select at least one file');
      return;
    }

    setUploadingDocs(true);

    try {
      const idToUse = await ensureInsuranceForm();

      if (!idToUse) {
        toast.error('Insurance form was not created');
        return;
      }

      await insuranceFormApi.uploadDocuments(idToUse, {
        files: docUpload.files,
        name: docUpload.name,
        documentDate: docUpload.documentDate || undefined,
        notes: docUpload.notes,
      });

      toast.success('Documents uploaded');

      setDocUpload({
        files: [],
        name: '',
        documentDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });

      setAddingDocs(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Document upload failed');
    } finally {
      setUploadingDocs(false);
    }
  };

  const deleteInsuranceDocument = async (documentId) => {
    if (!insuranceFormId) return;
    if (!window.confirm('Delete this document?')) return;

    try {
      await insuranceFormApi.deleteDocument(insuranceFormId, documentId);
      toast.success('Document deleted');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Document delete failed');
    }
  };

  const sendToBiller = async () => {
    try {
      await patientApi.sendToBiller(patient.mrn || patient._id);
      toast.success('Patient sent to biller');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to send to biller');
    }
  };

  if (loading) return <Loading message="Loading patient details..." />;
  if (!patient) return <EmptyState message="Patient not found" />;

  const tabs = patientTabsForRole(user?.role);
  const allowAddRound = canAddDoctorRound(user?.role);
  const roundsReadOnly = isTabReadOnly(user?.role, 'doctor rounds');

  const insuranceDocuments = insuranceFormData?.documents || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={personName(patient)}
        subtitle={`${patient.mrn} • ${patient.phone || 'No phone'}`}
        action={
          <div className="flex flex-wrap gap-2">
            {['admin', 'front_desk'].includes(user?.role) && (
              <button onClick={sendToBiller} className="btn-light">
                Send To Biller
              </button>
            )}

            {allowSchedule && (
              <Link to="/front-desk/scheduling" className="btn-primary">
                Create Schedule
              </Link>
            )}
          </div>
        }
      />

      <div className={`rounded-3xl border p-4 shadow-sm ${expiryClass(expiryDays)}`}>
        <b>Insurance Expiry:</b>{' '}
        {dateOnly(
          patient.insurance?.expiryDate ||
            insuranceFormData?.approvalValidTo ||
            insuranceFormData?.dueDate
        )}{' '}
        {expiryDays !== null && (
          <span>
            •{' '}
            {expiryDays < 0
              ? `${Math.abs(expiryDays)} days expired`
              : `${expiryDays} days remaining`}
          </span>
        )}
        <p className="text-xs">
          15 days or less shows red. 16–30 days shows warning.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Insurance</p>
          <StatusBadge
            status={
              patient.insurance?.coverageStatus ||
              insuranceFormData?.approvalStatus ||
              'not_submitted'
            }
          />
        </div>

        <div className="card p-4">
          <p className="text-xs text-slate-500">Current / Upcoming Schedules</p>
          <p className="text-2xl font-bold">{activeSchedules.length}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-slate-500">Completed Sessions</p>
          <p className="text-2xl font-bold">{completed.length}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-slate-500">Claims</p>
          <p className="text-2xl font-bold">{claims.length}</p>
        </div>
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'btn-primary' : 'btn-light'}
            onClick={() => {
              setTab(t.key);
              setPreviewMode(false);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <PatientBioPanel patient={patient} claims={claims} />
      )}

      {tab === 'insurance form' && (
        <InsuranceFormPanel patient={patient} />
      )}

      {tab === 'documents' && (
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Insurance Documents</h2>
              <p className="text-sm text-slate-500">
                These documents are stored inside Insurance Form documents.
              </p>
            </div>

            <div className="flex gap-2">
              <button className="btn-light inline-flex items-center gap-2" onClick={load}>
                <RefreshCw size={16} />
                Refresh
              </button>

              {allowUploadDocs && (
                <button
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={() => setAddingDocs((v) => !v)}
                >
                  {addingDocs ? <X size={16} /> : <Plus size={16} />}
                  {addingDocs ? 'Cancel' : 'Add Documents'}
                </button>
              )}
            </div>
          </div>

          {addingDocs && (
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <TextField
                  label="Group Name"
                  value={docUpload.name}
                  onChange={(v) =>
                    setDocUpload((p) => ({ ...p, name: v }))
                  }
                  placeholder="Insurance Card"
                />

                <TextField
                  label="Document Date"
                  type="date"
                  value={docUpload.documentDate}
                  onChange={(v) =>
                    setDocUpload((p) => ({ ...p, documentDate: v }))
                  }
                />

                <div className="md:col-span-2">
                  <label className="label">Select Files</label>
                  <input
                    className="input"
                    type="file"
                    multiple
                    onChange={(e) =>
                      setDocUpload((p) => ({
                        ...p,
                        files: Array.from(e.target.files || []),
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-4">
                  <TextAreaField
                    label="Notes"
                    value={docUpload.notes}
                    onChange={(v) =>
                      setDocUpload((p) => ({ ...p, notes: v }))
                    }
                  />
                </div>
              </div>

              <button
                className="btn-primary mt-3"
                disabled={uploadingDocs}
                onClick={uploadInsuranceDocuments}
              >
                {uploadingDocs
                  ? 'Uploading...'
                  : `Upload ${docUpload.files.length || ''} Document${
                      docUpload.files.length === 1 ? '' : 's'
                    }`}
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {insuranceDocuments.map((doc) => (
              <div className="rounded-2xl border p-4 text-sm" key={doc._id}>
                <b>{doc.name || doc.title || doc.originalName || 'Document'}</b>

                <p className="text-xs text-slate-500">
                  {doc.originalName || 'Uploaded file'} •{' '}
                  {dateOnly(doc.documentDate || doc.uploadedAt)} •{' '}
                  {doc.size ? `${Math.round(doc.size / 1024)} KB` : '-'}
                </p>

                {doc.notes && (
                  <p className="mt-2 text-slate-600">{doc.notes}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className="btn-light inline-flex"
                    href={fileUrl(doc.url || doc.fileUrl || doc.path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View File
                  </a>

                  {allowUploadDocs && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => deleteInsuranceDocument(doc._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!insuranceDocuments.length && (
              <EmptyState message="No insurance documents uploaded yet" />
            )}
          </div>
        </section>
      )}

      {tab === 'full profile' && form && (
        <section className="space-y-4">
          <div className="card flex items-center justify-between p-4">
            <h2 className="text-lg font-bold">Full Patient Profile</h2>

            <button
              type="button"
              className="btn-light"
              onClick={() => setPreviewMode((v) => !v)}
            >
              {previewMode || !allowEdit ? 'Back to Edit' : 'Preview'}
            </button>
          </div>

          {!allowEdit || previewMode ? (
            <PatientFormPreview form={form} />
          ) : (
            <>
              <section className="card p-5">
                <h3 className="mb-4 font-bold">Basic Information</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="First Name" value={form.firstName} onChange={(v) => setValue('firstName', v)} />
                  <TextField label="Last Name" value={form.lastName} onChange={(v) => setValue('lastName', v)} />
                  <TextField label="DOB" type="date" value={form.dob} onChange={(v) => setValue('dob', v)} />
                  <SelectField label="Gender" value={form.gender} onChange={(v) => setValue('gender', v)} options={['male', 'female', 'other']} />
                  <TextField label="Phone" value={form.phone} onChange={(v) => setValue('phone', v)} />
                  <TextField label="Email" type="email" value={form.email} onChange={(v) => setValue('email', v)} />
                  <TextField label="Address" value={form.address} onChange={(v) => setValue('address', v)} />
                  <TextField label="City" value={form.city} onChange={(v) => setValue('city', v)} />
                  <TextField label="State" value={form.state} onChange={(v) => setValue('state', v)} />
                  <TextField label="Zip" value={form.zip} onChange={(v) => setValue('zip', v)} />
                  <TextField label="Referral Source" value={form.referralSource} onChange={(v) => setValue('referralSource', v)} />
                  <TextField label="Hospital" value={form.hospital} onChange={(v) => setValue('hospital', v)} />
                </div>
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Patient Type</h3>

                <div className="grid gap-3 md:grid-cols-4">
                  <CheckboxField label="New Patient" checked={form.patientType.newPatient} onChange={(v) => setPatientType('newPatient', v)} />
                  <CheckboxField label="Transfer Patient" checked={form.patientType.transferPatient} onChange={(v) => setPatientType('transferPatient', v)} />
                  <CheckboxField label="Transient Patient" checked={form.patientType.transientPatient} onChange={(v) => setPatientType('transientPatient', v)} />
                  <CheckboxField label="Current Patient" checked={form.patientType.currentPatient} onChange={(v) => setPatientType('currentPatient', v)} />
                </div>
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Home Facility</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Facility Name" value={form.homeFacility.facilityName} onChange={(v) => setNested('homeFacility', 'facilityName', v)} />
                  <TextField label="Facility Phone" value={form.homeFacility.facilityPhone} onChange={(v) => setNested('homeFacility', 'facilityPhone', v)} />
                  <TextField label="Facility Fax" value={form.homeFacility.facilityFax} onChange={(v) => setNested('homeFacility', 'facilityFax', v)} />
                </div>
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Emergency Contact</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Contact Name" value={form.emergencyContact.name} onChange={(v) => setNested('emergencyContact', 'name', v)} />
                  <TextField label="Relation" value={form.emergencyContact.relation} onChange={(v) => setNested('emergencyContact', 'relation', v)} />
                  <TextField label="Phone" value={form.emergencyContact.phone} onChange={(v) => setNested('emergencyContact', 'phone', v)} />
                </div>
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Medical History</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Diagnosis" value={form.medicalHistory.diagnosis} onChange={(v) => setNested('medicalHistory', 'diagnosis', v)} />
                  <TextField label="Dialysis Frequency" value={form.medicalHistory.dialysisFrequency} onChange={(v) => setNested('medicalHistory', 'dialysisFrequency', v)} />
                  <TextField label="Access Type" value={form.medicalHistory.accessType} onChange={(v) => setNested('medicalHistory', 'accessType', v)} />
                  <TextField label="Allergies" value={form.medicalHistory.allergies} onChange={(v) => setNested('medicalHistory', 'allergies', v)} />
                  <TextField label="Post Weight" value={form.medicalHistory.postWeight} onChange={(v) => setNested('medicalHistory', 'postWeight', v)} />
                  <TextField label="Height" value={form.medicalHistory.height} onChange={(v) => setNested('medicalHistory', 'height', v)} />
                  <SelectField label="Diabetic" value={form.medicalHistory.diabetic} onChange={(v) => setNested('medicalHistory', 'diabetic', v)} options={['unknown', 'yes', 'no']} />
                  <TextField label="Renal Failure Due To Accident" value={form.medicalHistory.renalFailureDueToAccident} onChange={(v) => setNested('medicalHistory', 'renalFailureDueToAccident', v)} />
                  <TextField label="Had Dialysis Before" value={form.medicalHistory.hadDialysisBefore} onChange={(v) => setNested('medicalHistory', 'hadDialysisBefore', v)} />
                  <TextField label="Previous Dialysis Location" value={form.medicalHistory.previousDialysisLocation} onChange={(v) => setNested('medicalHistory', 'previousDialysisLocation', v)} />
                  <TextField label="Previous Dialysis Date" type="date" value={form.medicalHistory.previousDialysisDate} onChange={(v) => setNested('medicalHistory', 'previousDialysisDate', v)} />
                  <TextAreaField label="Medical Notes" value={form.medicalHistory.notes} onChange={(v) => setNested('medicalHistory', 'notes', v)} />
                </div>
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Registration / Admission</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Facility" value={form.registration.facility} onChange={(v) => setNested('registration', 'facility', v)} />
                  <TextField label="Admission Date" type="date" value={form.registration.admissionDate} onChange={(v) => setNested('registration', 'admissionDate', v)} />
                  <TextField label="First Dialysis Date" type="date" value={form.registration.firstDialysis} onChange={(v) => setNested('registration', 'firstDialysis', v)} />
                  <TextField label="Attending Physician" value={form.registration.attendingPhysician} onChange={(v) => setNested('registration', 'attendingPhysician', v)} />
                  <TextField label="Medical Record Number" value={form.registration.medicalRecordNumber} onChange={(v) => setNested('registration', 'medicalRecordNumber', v)} />
                  <TextField label="Marital Status" value={form.registration.maritalStatus} onChange={(v) => setNested('registration', 'maritalStatus', v)} />
                  <TextField label="Religion" value={form.registration.religion} onChange={(v) => setNested('registration', 'religion', v)} />
                  <TextAreaField label="Secondary Payer Address" value={form.registration.secondaryPayerAddress} onChange={(v) => setNested('registration', 'secondaryPayerAddress', v)} />
                </div>
              </section>

              <section className="card space-y-5 p-5">
                <h3 className="font-bold">Quick Insurance</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Provider Name" value={form.insurance.providerName} onChange={(v) => setNested('insurance', 'providerName', v)} />
                  <TextField label="Payer Name" value={form.insurance.payerName} onChange={(v) => setNested('insurance', 'payerName', v)} />
                  <TextField label="Policy Number" value={form.insurance.policyNumber} onChange={(v) => setNested('insurance', 'policyNumber', v)} />
                  <TextField label="Group Number" value={form.insurance.groupNumber} onChange={(v) => setNested('insurance', 'groupNumber', v)} />
                  <TextField label="Member ID" value={form.insurance.memberId} onChange={(v) => setNested('insurance', 'memberId', v)} />
                  <TextField label="Plan Type" value={form.insurance.planType} onChange={(v) => setNested('insurance', 'planType', v)} />
                  <SelectField label="Coverage Status" value={form.insurance.coverageStatus} onChange={(v) => setNested('insurance', 'coverageStatus', v)} options={['not_submitted', 'submitted', 'approved', 'rejected', 'expired']} />
                  <TextField label="Effective Date" type="date" value={form.insurance.effectiveDate} onChange={(v) => setNested('insurance', 'effectiveDate', v)} />
                  <TextField label="Expiry Date" type="date" value={form.insurance.expiryDate} onChange={(v) => setNested('insurance', 'expiryDate', v)} />
                  <YesNo label="Authorization Required" value={form.insurance.authorizationRequired} onChange={(v) => setNested('insurance', 'authorizationRequired', v)} />
                  <TextField label="Authorization Number" value={form.insurance.authorizationNumber} onChange={(v) => setNested('insurance', 'authorizationNumber', v)} />
                  <TextAreaField label="Insurance Notes" value={form.insurance.notes} onChange={(v) => setNested('insurance', 'notes', v)} />
                </div>

                <h3 className="font-bold">Insurance Authorization Form</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Clinic Name" value={form.insuranceForm.clinicName} onChange={(v) => setInsuranceForm('clinicName', v)} />
                  <SelectField label="Form Status" value={form.insuranceForm.formStatus} onChange={(v) => setInsuranceForm('formStatus', v)} options={['draft', 'submitted', 'approved', 'rejected', 'expired']} />
                  <SelectField label="Approval Status" value={form.insuranceForm.approvalStatus} onChange={(v) => setInsuranceForm('approvalStatus', v)} options={['not_submitted', 'submitted', 'approved', 'rejected', 'expired', 'pending']} />
                  <TextField label="Approval Reference" value={form.insuranceForm.approvalReference} onChange={(v) => setInsuranceForm('approvalReference', v)} />
                  <TextField label="Approval Valid From" type="date" value={form.insuranceForm.approvalValidFrom} onChange={(v) => setInsuranceForm('approvalValidFrom', v)} />
                  <TextField label="Approval Valid To" type="date" value={form.insuranceForm.approvalValidTo} onChange={(v) => setInsuranceForm('approvalValidTo', v)} />
                  <TextField label="Due Date" type="date" value={form.insuranceForm.dueDate} onChange={(v) => setInsuranceForm('dueDate', v)} />
                  <TextField label="Rejection Reason" value={form.insuranceForm.rejectionReason} onChange={(v) => setInsuranceForm('rejectionReason', v)} />
                </div>

                <InsuranceSection title="Primary Insurance" full data={form.insuranceForm.primaryInsurance} onChange={(v) => setInsuranceFormSection('primaryInsurance', v)} />
                <InsuranceSection title="Secondary Insurance" data={form.insuranceForm.secondaryInsurance} onChange={(v) => setInsuranceFormSection('secondaryInsurance', v)} />
                <InsuranceSection title="Third Insurance" data={form.insuranceForm.thirdInsurance} onChange={(v) => setInsuranceFormSection('thirdInsurance', v)} />
              </section>

              <section className="card p-5">
                <h3 className="mb-4 font-bold">Billing Approval</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <TextField label="Billing Dept Approval Signature" value={form.insuranceForm.billingDeptApprovalSignature} onChange={(v) => setInsuranceForm('billingDeptApprovalSignature', v)} />
                  <TextField label="Billing Dept Approval Date" type="date" value={form.insuranceForm.billingDeptApprovalDate} onChange={(v) => setInsuranceForm('billingDeptApprovalDate', v)} />
                  <TextAreaField label="Comments / Risk Notes" value={form.insuranceForm.comments} onChange={(v) => setInsuranceForm('comments', v)} />
                </div>
              </section>

              <button disabled={saving} onClick={saveFullProfile} className="btn-primary">
                {saving ? 'Saving...' : 'Save Full Profile'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'schedules' && (
        <section className="space-y-2">
          {activeSchedules.map((item) => (
            <div className="card p-4 text-sm" key={item._id || item.id || item.code}>
              <div className="flex justify-between gap-3">
                <b>{item.code}</b>
                <StatusBadge status={item.status} />
              </div>
              <p>
                {dateOnly(item.date)} • {item.startTime}-{item.endTime} • Chair{' '}
                {item.chair?.code || item.chairCode}
              </p>
            </div>
          ))}

          {!activeSchedules.length && (
            <EmptyState message="No current/upcoming schedules for this patient" />
          )}
        </section>
      )}

      {tab === 'medical history' && (
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">Medical History</h2>
          {patient.medicalHistory ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p><b>Diagnosis:</b> {patient.medicalHistory.diagnosis || '-'}</p>
              <p><b>Dialysis Frequency:</b> {patient.medicalHistory.dialysisFrequency || '-'}</p>
              <p><b>Access Type:</b> {patient.medicalHistory.accessType || '-'}</p>
              <p><b>Diabetic:</b> {patient.medicalHistory.diabetic || '-'}</p>
              <p><b>Height:</b> {patient.medicalHistory.height || '-'}</p>
              <p><b>Post Weight:</b> {patient.medicalHistory.postWeight || '-'}</p>
              <p><b>Had Dialysis Before:</b> {patient.medicalHistory.hadDialysisBefore || '-'}</p>
              <p><b>Previous Dialysis Location:</b> {patient.medicalHistory.previousDialysisLocation || '-'}</p>
              <p><b>Previous Dialysis Date:</b> {patient.medicalHistory.previousDialysisDate ? dateOnly(patient.medicalHistory.previousDialysisDate) : '-'}</p>
              <p><b>Renal Failure Due To Accident:</b> {patient.medicalHistory.renalFailureDueToAccident || '-'}</p>
              <p className="md:col-span-2"><b>Allergies:</b> {(patient.medicalHistory.allergies || []).join(', ') || '-'}</p>
              <p className="md:col-span-2"><b>Notes:</b> {patient.medicalHistory.notes || '-'}</p>
            </div>
          ) : (
            <EmptyState message="No medical history recorded" />
          )}
        </section>
      )}

      {tab === 'sessions' && (
        <section className="space-y-2">
          {sessions.map((item) => (
            <SessionHistoryCard session={item} key={item._id} />
          ))}
          {!sessions.length && <EmptyState message="No sessions yet" />}
        </section>
      )}

      {tab === 'treatment' && (
        <section className="space-y-2">
          {completed.map((item) => (
            <SessionHistoryCard session={item} key={item._id} />
          ))}
          {!completed.length && (
            <EmptyState message="No completed treatments yet" />
          )}
        </section>
      )}


      {tab === 'doctor rounds' && (
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Doctor SOAP / Checkup History</h2>
              <p className="text-sm text-slate-500">
                Monthly doctor checkups grouped by month and round. Documents uploaded by doctor are shown inside each round.
              </p>
            </div>
            <div className="flex gap-2">
              {allowAddRound && !roundsReadOnly && (
                <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowRoundForm((v) => !v)}>
                  <Plus size={16} />
                  {showRoundForm ? 'Close' : 'Add SOAP Round'}
                </button>
              )}
              <button className="btn-light inline-flex items-center gap-2" onClick={load}>
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {allowAddRound && !roundsReadOnly && showRoundForm && (
            <form onSubmit={submitRound} className="space-y-5 rounded-3xl border border-blue-100 bg-blue-50/40 p-5">
              <h3 className="text-base font-extrabold text-slate-900">Add Doctor SOAP Checkup</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div><label className="label">Month</label><input className="input" type="number" min="1" max="12" value={roundForm.month} onChange={(e) => updateRound('month', e.target.value)} /></div>
                <div><label className="label">Year</label><input className="input" type="number" value={roundForm.year} onChange={(e) => updateRound('year', e.target.value)} /></div>
                <div><label className="label">Round</label><select className="input" value={roundForm.roundNumber} onChange={(e) => updateRound('roundNumber', e.target.value)}>{[1, 2, 3, 4].map((r) => <option key={r} value={r}>Round {r}</option>)}</select></div>
                <div><label className="label">Checkup Date</label><input className="input" type="date" value={roundForm.checkupDate} onChange={(e) => updateRound('checkupDate', e.target.value)} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div><label className="label">Blood Pressure</label><input className="input" placeholder="120/80" value={roundForm.vitals.bloodPressure} onChange={(e) => updateRound('vitals.bloodPressure', e.target.value)} /></div>
                <div><label className="label">Pulse</label><input className="input" value={roundForm.vitals.pulse} onChange={(e) => updateRound('vitals.pulse', e.target.value)} /></div>
                <div><label className="label">Temperature</label><input className="input" value={roundForm.vitals.temperature} onChange={(e) => updateRound('vitals.temperature', e.target.value)} /></div>
                <div><label className="label">Respiratory Rate</label><input className="input" value={roundForm.vitals.respiratoryRate} onChange={(e) => updateRound('vitals.respiratoryRate', e.target.value)} /></div>
                <div><label className="label">Weight</label><input className="input" value={roundForm.vitals.weight} onChange={(e) => updateRound('vitals.weight', e.target.value)} /></div>
                <div><label className="label">Oxygen Saturation</label><input className="input" value={roundForm.vitals.oxygenSaturation} onChange={(e) => updateRound('vitals.oxygenSaturation', e.target.value)} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="label">Subjective</label><textarea className="input min-h-24" value={roundForm.soap.subjective} onChange={(e) => updateRound('soap.subjective', e.target.value)} /></div>
                <div><label className="label">Objective</label><textarea className="input min-h-24" value={roundForm.soap.objective} onChange={(e) => updateRound('soap.objective', e.target.value)} /></div>
                <div><label className="label">Assessment</label><textarea className="input min-h-24" value={roundForm.soap.assessment} onChange={(e) => updateRound('soap.assessment', e.target.value)} /></div>
                <div><label className="label">Plan</label><textarea className="input min-h-24" value={roundForm.soap.plan} onChange={(e) => updateRound('soap.plan', e.target.value)} /></div>
                <div><label className="label">Doctor Notes</label><textarea className="input min-h-24" value={roundForm.soap.doctorNotes} onChange={(e) => updateRound('soap.doctorNotes', e.target.value)} /></div>
                <div><label className="label">Next Follow-up Date</label><input className="input" type="date" value={roundForm.nextFollowUpDate} onChange={(e) => updateRound('nextFollowUpDate', e.target.value)} /></div>
              </div>
              <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4">
                <h4 className="mb-3 font-extrabold text-slate-900">Upload SOAP Documents (multiple allowed)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><label className="label">Document Name</label><input className="input" value={roundForm.documentName} onChange={(e) => updateRound('documentName', e.target.value)} /></div>
                  <div><label className="label">Document Notes</label><input className="input" value={roundForm.documentNotes} onChange={(e) => updateRound('documentNotes', e.target.value)} /></div>
                  <div><label className="label">PDF / Image / DOC</label><input className="input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => updateRound('documents', Array.from(e.target.files || []))} /></div>
                </div>
                {!!roundForm.documents.length && (
                  <p className="mt-2 text-xs font-semibold text-blue-700">{roundForm.documents.length} file(s) selected</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-light" onClick={() => setShowRoundForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingRound}>{savingRound ? 'Saving...' : 'Submit SOAP Round'}</button>
              </div>
            </form>
          )}

          {!doctorCheckupsByMonth.length && (
            <EmptyState message="No doctor SOAP checkups recorded yet" />
          )}

          {doctorCheckupsByMonth.map((monthGroup) => (
            <div className="rounded-3xl border bg-white p-4 shadow-sm" key={monthGroup.key}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{monthGroup.label}</h3>
                  <p className="text-xs text-slate-500">
                    {monthGroup.rounds.length}/4 rounds completed for this month
                  </p>
                </div>
                <StatusBadge
                  status={monthGroup.rounds.length >= 4 ? 'complete' : `${monthGroup.rounds.length}/4 rounds`}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {monthGroup.rounds.map((checkup) => (
                  <div className="rounded-2xl border bg-slate-50 p-4" key={checkup._id}>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Round {checkup.roundNumber}
                        </p>
                        <h4 className="text-base font-extrabold text-slate-900">
                          {dateOnly(checkup.checkupDate)}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Doctor: {checkup.doctor?.name || checkup.doctor?.email || 'Doctor'}
                        </p>
                      </div>
                      <StatusBadge status={checkup.status || 'completed'} />
                    </div>

                    <div className="grid gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-slate-500">BP</p>
                        <b>{checkup.vitals?.bloodPressure || '-'}</b>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-slate-500">Pulse</p>
                        <b>{checkup.vitals?.pulse || '-'}</b>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-slate-500">Weight</p>
                        <b>{checkup.vitals?.weight || '-'}</b>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-xl bg-white p-3">
                        <p className="font-bold text-slate-700">Subjective</p>
                        <p className="text-slate-600">{checkup.soap?.subjective || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="font-bold text-slate-700">Objective</p>
                        <p className="text-slate-600">{checkup.soap?.objective || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="font-bold text-slate-700">Assessment</p>
                        <p className="text-slate-600">{checkup.soap?.assessment || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="font-bold text-slate-700">Plan</p>
                        <p className="text-slate-600">{checkup.soap?.plan || '-'}</p>
                      </div>
                    </div>

                    {checkup.soap?.doctorNotes && (
                      <div className="mt-3 rounded-xl bg-white p-3 text-sm">
                        <p className="font-bold text-slate-700">Doctor Notes</p>
                        <p className="text-slate-600">{checkup.soap.doctorNotes}</p>
                      </div>
                    )}

                    {!!checkup.documents?.length && (
                      <div className="mt-3 rounded-xl bg-white p-3">
                        <p className="mb-2 text-sm font-bold text-slate-700">SOAP Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {checkup.documents.map((doc) => (
                            <a
                              key={doc._id || doc.url}
                              className="btn-light text-xs"
                              href={fileUrl(doc.url || doc.filePath)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {doc.name || doc.originalName || 'View Document'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'claims' && (
        <section className="space-y-2">
          {claims.map((claim) => (
            <div className="card p-4 text-sm" key={claim._id}>
              <div className="flex justify-between gap-3">
                <b>{claim.claimReference}</b>
                <StatusBadge status={claim.status} />
              </div>
              <p>
                {claim.month} • Rs {money(claim.amount)} •{' '}
                {claim.insuranceProvider}
              </p>
            </div>
          ))}

          {!claims.length && <EmptyState message="No claims yet" />}
        </section>
      )}
    </div>
  );
}