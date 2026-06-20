import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Folder, Pencil, Trash2, Upload, Eye, X, Download, RefreshCw,ExternalLink } from 'lucide-react';
import { INSURANCE_STATUS } from '../../constants';
import { insuranceFormApi } from '../../api/insuranceFormApi';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from './EmptyState';
import Loading from './Loading';
import { dateOnly, fileUrl } from '../../utils/format';
import PdfViewer from '../common/pdfViewer'
import { insuranceCategories, emptyInsurance, cleanInsurance, InsuranceSection } from './InsuranceSectionFields';


console.log('PROD:', import.meta.env.PROD);
console.log('DEV:', import.meta.env.DEV);
console.log('API:', import.meta.env.VITE_API_BASE_URL);
function buildApiUrl(documentUrl) {
  if (!documentUrl) return null;

  const match = documentUrl.match(/\/uploads\/(.+)/);
  if (!match) return null;

  const filePart = match[1];

  return `${import.meta.env.VITE_API_BASE_URL}/files/${filePart}`;
}

const emptyForm = {
  clinicName: 'AZUSA',
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
};

const dateValue = (value) => (value ? String(value).slice(0, 10) : '');
const val = (value) => (value === undefined || value === null || value === '' ? '-' : String(value));
const bool = (value) => value === true || value === 'true';



function normalizeForm(data) {
  if (!data) return emptyForm;
  return {
    ...emptyForm,
    ...data,
    admissionDate: dateValue(data.admissionDate),
    approvalValidFrom: dateValue(data.approvalValidFrom),
    approvalValidTo: dateValue(data.approvalValidTo),
    dueDate: dateValue(data.dueDate),
    billingDeptApprovalDate: dateValue(data.billingDeptApprovalDate),
    primaryInsurance: cleanInsurance(data.primaryInsurance),
    secondaryInsurance: cleanInsurance(data.secondaryInsurance),
    thirdInsurance: cleanInsurance(data.thirdInsurance),
  };
}

function stripEmptyDates(obj) {
  const out = Array.isArray(obj) ? [] : {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value === '') {
      out[key] = undefined;
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)) {
      out[key] = stripEmptyDates(value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

function Input({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function TextField({ label, type = 'text', value, onChange, placeholder }) {
  return <Input label={label}><input className="input" type={type} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Input>;
}

function SelectField({ label, value, onChange, options }) {
  return <Input label={label}><select className="input" value={value || ''} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option value={item} key={item}>{item || 'select'}</option>)}</select></Input>;
}

function YesNo({ label, value, onChange }) {
  return <Input label={label}><select className="input" value={String(bool(value))} onChange={(event) => onChange(event.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></select></Input>;
}



function InsuranceSummary({ title, data }) {
  const items = [
    ['Provider', data?.providerName], ['Payer', data?.payerName], ['Category', data?.insuranceCategory], ['Member ID', data?.memberId],
    ['Policy', data?.policyNumber], ['Group', data?.groupNumber], ['Subscriber', data?.subscriberName], ['Plan', data?.planType],
    ['Effective', dateOnly(data?.effectiveDate)], ['Auth Required', bool(data?.authorizationRequired) ? 'Yes' : 'No'], ['Referral Required', bool(data?.referralRequired) ? 'Yes' : 'No'], ['Notes', data?.notes],
  ];
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 font-extrabold text-slate-950">{title}</h3><div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{items.map(([label, value]) => <div className="rounded-2xl bg-slate-50 p-3" key={label}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="font-bold text-slate-800">{val(value)}</p></div>)}</div></section>;
}

function ImageViewer({ url, name }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <FileText size={48} className="opacity-30" />
        <p>Failed to load image</p>
        <a href={url} target="_blank" rel="noreferrer" className="btn-light text-sm">
          Open in New Tab
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <img
        src={url}
        alt={name || 'Document'}
        className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow"
        onError={() => setError(true)}
      />
    </div>
  );
}

function FileViewerModal({ document, onClose }) {
  if (!document) return null;

  // ✅ Raw URL for download/new-tab
  const rawUrl = document.url
    ? `http://localhost:5000${document.url}`
    : null;

  // ✅ API URL for fetching (bypasses CORS on static)
  const apiUrl = buildApiUrl(document.url);

  console.log('🔍 document.url:', document.url);
  console.log('🔍 rawUrl:', rawUrl);
  console.log('🔍 apiUrl:', apiUrl);

  const isPdf =
    /^application\/pdf$/i.test(document.fileType || '') ||
    /\.pdf$/i.test(document.url || '');

  const isImage =
    /^image\//i.test(document.fileType || '') ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(document.url || '');

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold text-slate-900">
              {document.name || document.originalName || 'Document Preview'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {isPdf ? 'PDF Document' : isImage ? 'Image' : document.fileType || 'File'}
              {document.size ? ` • ${Math.round(document.size / 1024)} KB` : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {rawUrl && (
              <a
                href={rawUrl}
                download
                className="btn-light inline-flex items-center gap-1.5 text-sm"
              >
                <Download size={15} /> Download
              </a>
            )}
            {rawUrl && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-light inline-flex items-center gap-1.5 text-sm"
              >
                <ExternalLink size={15} /> New Tab
              </a>
            )}
            <button
              onClick={onClose}
              className="btn-light inline-flex items-center justify-center p-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className="flex flex-1 flex-col overflow-auto bg-slate-100 p-3"
          style={{ minHeight: 0 }}
        >
          {!rawUrl ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <FileText size={48} className="opacity-30" />
              <p className="font-semibold">No document URL found</p>
            </div>

          ) : isImage ? (
            <ImageViewer url={rawUrl} name={document.name || document.originalName} />

          ) : isPdf ? (
            <PdfViewer
              apiUrl={apiUrl}
              downloadUrl={rawUrl}
              name={document.name || document.originalName}
            />

          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-500">
              <FileText size={56} className="text-slate-300" />
              <p className="text-lg font-extrabold text-slate-700">
                Cannot preview this file
              </p>
              <p className="text-sm text-slate-400">
                File type <b>{document.fileType || 'unknown'}</b> cannot be previewed
              </p>
              <div className="flex gap-3">
                <a
                  href={rawUrl}
                  download
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Download size={16} /> Download
                </a>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-light inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} /> Open in Browser
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function DocumentRow({ document, formId, onRefresh, onView }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [local, setLocal] = useState({ name: document.name || '', documentDate: dateValue(document.documentDate), notes: document.notes || '' });
  const url = fileUrl(document.url);
  const isLegacyMissingPath = !document.filePath;

  const save = async () => {
    setSaving(true);
    try {
      await insuranceFormApi.updateDocument(formId, document._id, local);
      toast.success('Document info updated');
      setEditing(false);
      onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Document update failed');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this document?')) return;
    setDeleting(true);
    try {
      const res = await insuranceFormApi.deleteDocument(formId, document._id);
      toast.success(res.data?.message || 'Document deleted');
      onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Document delete failed');
    } finally { setDeleting(false); }
  };

  return (
    <div className="ml-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:ml-6">
      {!editing ? <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="break-words font-extrabold text-slate-900">{document.name || document.originalName || 'Insurance Document'}</p>
            <p className="text-xs text-slate-500">Original: {document.originalName || '-'} • Date: {dateOnly(document.documentDate || document.uploadedAt)} • Size: {document.size ? `${Math.round(document.size / 1024)} KB` : '-'}</p>
            <p className="mt-1 break-all text-xs text-slate-400">{document.url || '-'}</p>
            <p className="mt-2 text-slate-600">{document.notes || 'No notes'}</p>
            {isLegacyMissingPath && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Old document record: filePath is missing. Frontend can preview by URL. Backend schema is now optional, so edit/delete should work after backend restart.</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && <button className="btn-light inline-flex items-center gap-1" onClick={() => onView(document)}><Eye size={16}/> View Popup</button>}
          <button className="btn-light inline-flex items-center gap-1" onClick={() => setEditing(true)}><Pencil size={16}/> Edit Info</button>
          <button className="btn-danger inline-flex items-center gap-1" disabled={deleting} onClick={remove}><Trash2 size={16}/> {deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div> : <div className="grid gap-3 md:grid-cols-3">
        <TextField label="Document Name" value={local.name} onChange={(v) => setLocal((p) => ({ ...p, name: v }))} />
        <TextField label="Document Date" type="date" value={local.documentDate} onChange={(v) => setLocal((p) => ({ ...p, documentDate: v }))} />
        <TextField label="Notes" value={local.notes} onChange={(v) => setLocal((p) => ({ ...p, notes: v }))} />
        <div className="rounded-2xl bg-blue-50 p-3 text-xs font-semibold text-blue-800 md:col-span-3">This edits document name, date, and notes only. To replace the actual file, upload a new document record.</div>
        <div className="flex flex-wrap gap-2 md:col-span-3"><button disabled={saving} className="btn-primary" onClick={save}>{saving ? 'Saving...' : 'Save Document Info'}</button><button className="btn-light" onClick={() => setEditing(false)}>Cancel</button></div>
      </div>}
    </div>
  );
}

function DocumentTree({ formId, documents = [], onRefresh, onView }) {
  const grouped = useMemo(() => {
    const list = [...documents].sort((a, b) => new Date(b.documentDate || b.uploadedAt || 0) - new Date(a.documentDate || a.uploadedAt || 0));
    return list.reduce((acc, doc) => {
      const key = dateOnly(doc.documentDate || doc.uploadedAt) || 'No date';
      acc[key] = acc[key] || [];
      acc[key].push(doc);
      return acc;
    }, {});
  }, [documents]);

  if (!documents.length) return <EmptyState message="No insurance documents uploaded yet" />;
  return <div className="space-y-3">{Object.entries(grouped).map(([date, items]) => <div key={date} className="space-y-2"><div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-extrabold text-slate-700"><Folder size={18}/> {date} <span className="font-semibold text-slate-500">({items.length})</span></div>{items.map((doc) => <DocumentRow key={doc._id} document={doc} formId={formId} onRefresh={onRefresh} onView={onView} />)}</div>)}</div>;
}

export default function InsuranceFormPanel({ patient }) {
  const patientId = patient?._id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState('view');
  const [insuranceForm, setInsuranceForm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [upload, setUpload] = useState({ files: [], name: 'Insurance Documents', documentDate: dateValue(new Date().toISOString()), notes: '' });
  const [viewerDoc, setViewerDoc] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const hasLegacyDocuments = useMemo(() => (insuranceForm?.documents || []).some((doc) => !doc.filePath), [insuranceForm]);

  const load = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await insuranceFormApi.getByPatient(patientId);
      const data = res.data?.data || null;
      setInsuranceForm(data);
      setForm(normalizeForm(data || { patient: patientId, patientMrn: patient?.mrn, admissionDate: dateValue(new Date().toISOString()) }));
      setMode(data?._id ? 'view' : 'edit');
    } catch (error) {
      if (error?.response?.status !== 404) toast.error(error?.response?.data?.message || 'Failed to load insurance form');
      setInsuranceForm(null);
      setForm(normalizeForm({ patient: patientId, patientMrn: patient?.mrn, admissionDate: dateValue(new Date().toISOString()) }));
      setMode('edit');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [patientId]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setInsurance = (section, value) => setForm((prev) => ({ ...prev, [section]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = stripEmptyDates({ ...form });
      const res = insuranceForm?._id
        ? await insuranceFormApi.update(insuranceForm._id, payload)
        : await insuranceFormApi.createForPatient(patientId, payload);
      const data = res.data?.data;
      setInsuranceForm(data);
      setForm(normalizeForm(data));
      setMode('view');
      toast.success(insuranceForm?._id ? 'Insurance form updated' : 'Insurance form created');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Insurance form save failed');
    } finally { setSaving(false); }
  };

  const removeForm = async () => {
    if (!insuranceForm?._id || !window.confirm('Delete full insurance form and all document records?')) return;
    try {
      await insuranceFormApi.delete(insuranceForm._id);
      toast.success('Insurance form deleted');
      setInsuranceForm(null);
      setForm(normalizeForm({ patient: patientId, patientMrn: patient?.mrn, admissionDate: dateValue(new Date().toISOString()) }));
      setMode('edit');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Insurance form delete failed');
    }
  };

  const uploadDocuments = async () => {
    if (!insuranceForm?._id) {
      toast.error('Save insurance form before uploading documents');
      return;
    }
    if (!upload.files?.length) {
      toast.error('Select at least one document');
      return;
    }
    setUploading(true);
    try {
      await insuranceFormApi.uploadDocuments(insuranceForm._id, upload);
      toast.success('Documents uploaded');
      setUpload({ files: [], name: 'Insurance Documents', documentDate: dateValue(new Date().toISOString()), notes: '' });
      setFileInputKey((k) => k + 1);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  if (loading) return <Loading message="Loading insurance form..." />;

  return <div className="space-y-5">
    {viewerDoc && <FileViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} />}

    <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-cyan-600 to-emerald-500 p-5 text-white shadow-xl shadow-blue-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-blue-100">Insurance Verification</p>
          <h2 className="text-2xl font-black">Insurance Form</h2>
          <p className="max-w-3xl text-sm font-medium text-blue-50">Primary, secondary, third insurance, approval dates, comments, Auth Risk / DOFR Risk and document history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {insuranceForm?._id && <StatusBadge status={insuranceForm.approvalStatus || 'not_submitted'} />}
          <button className={mode === 'edit' ? 'rounded-xl bg-white px-4 py-2 font-bold text-blue-700' : 'rounded-xl bg-white/15 px-4 py-2 font-bold text-white ring-1 ring-white/30'} onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}>{mode === 'edit' ? 'View Form' : insuranceForm?._id ? 'Edit Form' : 'Create Form'}</button>
          {insuranceForm?._id && <button className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white transition hover:bg-red-600" onClick={removeForm}>Delete Form</button>}
        </div>
      </div>
    </section>

    {mode === 'view' && insuranceForm?._id ? <>
      <section className="card p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[['Clinic', insuranceForm.clinicName], ['Form Status', insuranceForm.formStatus], ['Approval', insuranceForm.approvalStatus], ['Due Date', dateOnly(insuranceForm.dueDate)], ['Admission Date', dateOnly(insuranceForm.admissionDate)], ['Valid From', dateOnly(insuranceForm.approvalValidFrom)], ['Valid To', dateOnly(insuranceForm.approvalValidTo)], ['Reference', insuranceForm.approvalReference]].map(([label, value]) => <div className="rounded-2xl bg-slate-50 p-3" key={label}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="font-extrabold text-slate-900">{val(value)}</p></div>)}
        </div>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><b>Comments / Risk Notes:</b><p>{insuranceForm.comments || 'No comments'}</p></div>
      </section>
      <InsuranceSummary title="Primary Insurance" data={insuranceForm.primaryInsurance || {}} />
      <InsuranceSummary title="Secondary Insurance" data={insuranceForm.secondaryInsurance || {}} />
      <InsuranceSummary title="Third Insurance" data={insuranceForm.thirdInsurance || {}} />
    </> : <section className="card space-y-5 p-5">
      <h3 className="text-lg font-extrabold text-slate-950">{insuranceForm?._id ? 'Edit Insurance Form' : 'Create Insurance Form'}</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Clinic Name" value={form.clinicName} onChange={(v) => setField('clinicName', v)} />
        <TextField label="Admission Date" type="date" value={form.admissionDate} onChange={(v) => setField('admissionDate', v)} />
        <SelectField label="Form Status" value={form.formStatus} onChange={(v) => setField('formStatus', v)} options={['draft', 'submitted', 'approved', 'rejected', 'expired']} />
        <SelectField label="Approval Status" value={form.approvalStatus} onChange={(v) => setField('approvalStatus', v)} options={INSURANCE_STATUS} />
        <TextField label="Approval Reference" value={form.approvalReference} onChange={(v) => setField('approvalReference', v)} />
        <TextField label="Due Date" type="date" value={form.dueDate} onChange={(v) => setField('dueDate', v)} />
        <TextField label="Valid From" type="date" value={form.approvalValidFrom} onChange={(v) => setField('approvalValidFrom', v)} />
        <TextField label="Valid To" type="date" value={form.approvalValidTo} onChange={(v) => setField('approvalValidTo', v)} />
        <TextField label="Billing Approval Date" type="date" value={form.billingDeptApprovalDate} onChange={(v) => setField('billingDeptApprovalDate', v)} />
        <TextField label="Billing Approval Signature" value={form.billingDeptApprovalSignature} onChange={(v) => setField('billingDeptApprovalSignature', v)} />
        <TextField label="Rejection Reason" value={form.rejectionReason} onChange={(v) => setField('rejectionReason', v)} />
        <div className="md:col-span-3"><label className="label">Comments / Auth Risk / DOFR Risk</label><textarea className="input min-h-28" value={form.comments || ''} onChange={(e) => setField('comments', e.target.value)} placeholder="Auth Risk: High. DOFR Risk: Need billing review." /></div>
      </div>
      <InsuranceSection title="Primary Insurance" full data={form.primaryInsurance} onChange={(v) => setInsurance('primaryInsurance', v)} />
      <InsuranceSection title="Secondary Insurance" data={form.secondaryInsurance} onChange={(v) => setInsurance('secondaryInsurance', v)} />
      <InsuranceSection title="Third Insurance" data={form.thirdInsurance} onChange={(v) => setInsurance('thirdInsurance', v)} />
      <div className="flex flex-wrap gap-2"><button disabled={saving} className="btn-primary" onClick={save}>{saving ? 'Saving...' : 'Save Insurance Form'}</button>{insuranceForm?._id && <button className="btn-light" onClick={() => setMode('view')}>Cancel</button>}</div>
    </section>}

    <section className="card space-y-4 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-blue-600"/><h3 className="font-extrabold text-slate-950">Upload Insurance Documents</h3></div>
        <button className="btn-light inline-flex items-center gap-2" onClick={load}><RefreshCw size={16}/> Refresh</button>
      </div>
      {hasLegacyDocuments && <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800"><b>Note:</b> some old documents do not have <code>filePath</code>. Your updated backend model makes it optional, so old records can stay and new uploads will still add <code>filePath</code>.</div>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Document Group Name" value={upload.name} onChange={(v) => setUpload((p) => ({ ...p, name: v }))} />
        <TextField label="Document Date" type="date" value={upload.documentDate} onChange={(v) => setUpload((p) => ({ ...p, documentDate: v }))} />
        <Input label="Select PDFs / Images"><input key={fileInputKey} className="input" multiple type="file" accept=".pdf,image/*" onChange={(e) => setUpload((p) => ({ ...p, files: Array.from(e.target.files || []) }))} /></Input>
        <div className="md:col-span-3"><label className="label">Upload Notes</label><textarea className="input min-h-20" value={upload.notes} onChange={(e) => setUpload((p) => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <button className="btn-primary" onClick={uploadDocuments} disabled={!insuranceForm?._id || uploading}>{uploading ? 'Uploading...' : 'Upload Documents'}</button>
      {!insuranceForm?._id && <p className="text-sm font-semibold text-amber-700">Save insurance form first, then upload documents.</p>}
    </section>

    <section className="card space-y-4 p-5">
      <div>
        <h3 className="font-extrabold text-slate-950">Documents Tree / History</h3>
        <p className="text-sm text-slate-500">Newest documents stay on top; old documents automatically move down. Every document can be viewed in popup, edited, or deleted.</p>
      </div>
      <DocumentTree formId={insuranceForm?._id} documents={insuranceForm?.documents || []} onRefresh={load} onView={setViewerDoc} />
    </section>
  </div>;
}
