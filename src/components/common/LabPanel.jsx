import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, Upload, X, FileText } from 'lucide-react';
import { labApi, LAB_CATEGORIES, LAB_ACCEPT } from '../../api/labApi';
import { useAuth } from '../../context/AuthContext';
import NoteAuthor from './NoteAuthor';
import Portal from './Portal';
import PdfViewer from './pdfViewer';
import { API_BASE_URL } from '../../constants';
import api from '../../api/axios';

/** /uploads/lab-reports/x.pdf -> {API}/files/lab-reports/x.pdf (auth-aware route) */
const toFileApiUrl = (url = '') => {
  const match = String(url).match(/\/uploads\/(.+)/);
  return match ? `${API_BASE_URL}/files/${match[1]}` : '';
};

/** /uploads/lab-reports/x.png -> /files/lab-reports/x.png (relative, for the axios instance) */
const toFileApiPath = (url = '') => {
  const match = String(url).match(/\/uploads\/(.+)/);
  return match ? `/files/${match[1]}` : '';
};

/**
 * The file route requires auth, and an <img> tag cannot send the Authorization
 * header, so fetch the image through the axios instance and render a blob URL.
 */
function AuthedImage({ file }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    api
      .get(toFileApiPath(file.fileUrl), { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(r.data);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.fileUrl]);

  if (failed) return <p className="text-sm text-slate-500">Could not load this image.</p>;
  if (!src) return <p className="text-sm text-slate-400">Loading image...</p>;
  return <img src={src} alt={file.name || 'Lab report'} className="max-h-full max-w-full rounded-lg object-contain shadow" />;
}

const isImage = (f) => /^image\//.test(f?.mimeType || '') || /\.(png|jpe?g|webp|gif)$/i.test(f?.name || '');
const isPdf = (f) => (f?.mimeType || '') === 'application/pdf' || /\.pdf$/i.test(f?.name || '');

const BLANK = { testName: '', category: '', testDate: '', result: '', notes: '' };

/**
 * Laboratory reports for a patient.
 * Nurses and doctors (and admins) can upload; every other role is view-only.
 * Pass `session` to attach the upload to the dialysis session in progress;
 * omit it for a standalone/separate upload.
 */
export default function LabPanel({ patientId, session, compact = false }) {
  const { user } = useAuth();
  const canUpload = ['nurse', 'doctor', 'admin'].includes(user?.role);

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...BLANK });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInput = useRef(null);
  const [viewFile, setViewFile] = useState(null);

  const load = () => {
    if (!patientId) return;
    setLoading(true);
    labApi.list({ patient: patientId })
      .then((r) => setLabs(r.data?.data || []))
      .catch(() => setLabs([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const submit = async () => {
    if (!form.testName.trim()) { toast.error('Enter a test name'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('patient', patientId);
      if (session) fd.append('session', session);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      files.forEach((f) => fd.append('files', f));

      await labApi.upload(fd);
      toast.success('Lab report uploaded');
      setForm({ ...BLANK });
      setFiles([]);
      if (fileInput.current) fileInput.current.value = '';
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  const remove = async (lab) => {
    if (!window.confirm(`Remove lab report "${lab.testName}"?`)) return;
    try {
      await labApi.remove(lab._id);
      toast.success('Lab report removed');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><FlaskConical size={18} className="text-purple-600" /> Laboratory Reports</h3>
          <p className="mt-1 text-sm text-slate-500">
            {canUpload
              ? `Upload lab results${session ? ' for this dialysis session' : ''}. Images and documents accepted.`
              : 'View only. Lab reports are uploaded by a nurse or doctor.'}
          </p>
        </div>
        {canUpload && (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
            <Upload size={15} /> {showForm ? 'Cancel' : 'Upload Lab Report'}
          </button>
        )}
      </div>

      {canUpload && showForm && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid gap-3 md:grid-cols-12">
            <label className="md:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Test name *</span>
              <input className="input w-full" placeholder="e.g. Serum Creatinine" value={form.testName} onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))} />
            </label>
            <label className="md:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Category</span>
              <select className="input w-full" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Select</option>
                {LAB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="md:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Test date</span>
              <input className="input w-full" type="date" value={form.testDate} onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))} />
            </label>
            <label className="md:col-span-6">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Result / values</span>
              <input className="input w-full" placeholder="e.g. 5.2 mg/dL" value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
            </label>
            <label className="md:col-span-6">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Notes</span>
              <input className="input w-full" placeholder="Optional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
            <label className="md:col-span-12">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Files (images, PDF, Word, Excel)</span>
              <input ref={fileInput} className="input w-full" type="file" multiple accept={LAB_ACCEPT} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              {!!files.length && <span className="mt-1 block text-xs text-slate-500">{files.length} file(s) selected</span>}
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Uploading...' : 'Save Lab Report'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading lab reports...</p>
      ) : !labs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-sm font-semibold text-slate-500">No lab reports recorded.</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {labs.map((lab) => (
            <div key={lab._id} className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-purple-900">{lab.testName}</p>
                    {lab.category && <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">{lab.category}</span>}
                    {lab.session && <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">During dialysis</span>}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {lab.testDate && <span><b>Test date:</b> {new Date(lab.testDate).toLocaleDateString()}</span>}
                    {lab.result && <span><b>Result:</b> {lab.result}</span>}
                  </div>
                  {lab.notes && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">{lab.notes}</p>}

                  {!!lab.files?.length && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lab.files.map((f) => (
                        <button
                          type="button"
                          key={f._id || f.fileUrl}
                          onClick={() => setViewFile(f)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
                        >
                          <FileText size={12} /> {f.name || 'File'}
                        </button>
                      ))}
                    </div>
                  )}

                  <NoteAuthor name={lab.uploadedByName} role={lab.uploadedByRole} at={lab.uploadedAt} />
                </div>

                {canUpload && (
                  <button type="button" title="Remove lab report" className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600" onClick={() => remove(lab)}>
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewFile && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
            onClick={() => setViewFile(null)}
          >
            <div
              className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <b className="truncate text-sm">{viewFile.name || 'Lab document'}</b>
                <div className="flex items-center gap-3">
                  <a
                    href={toFileApiUrl(viewFile.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                  <button type="button" onClick={() => setViewFile(null)}>
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
                {isImage(viewFile) ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <AuthedImage file={viewFile} />
                  </div>
                ) : isPdf(viewFile) ? (
                  <div className="h-full">
                    <PdfViewer
                      apiUrl={toFileApiUrl(viewFile.fileUrl)}
                      downloadUrl={toFileApiUrl(viewFile.fileUrl)}
                      name={viewFile.name}
                    />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <FileText size={40} className="text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">
                      {viewFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Word, Excel and other documents cannot be previewed in the browser.
                    </p>
                    <a
                      className="btn-primary text-sm"
                      href={toFileApiUrl(viewFile.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download / Open
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
