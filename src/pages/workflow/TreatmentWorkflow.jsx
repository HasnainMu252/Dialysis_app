import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sessionApi } from '../../api/sessionApi';
import { chairClearanceApi } from '../../api/chairClearanceApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { dateOnly, personName } from '../../utils/format';

const blankVitals = { phase: 'before', bloodPressure: '', heartRate: '', temperature: '', weight: '', spo2: '' };
const blankSoap = { subjective: '', objective: '', assessment: '', plan: '' };
const defaultChairChecklist = { chairChecked: true, machineChecked: true, filterChecked: true, solutionChecked: true, cleaned: true, safeForUse: true };

export default function TreatmentWorkflow() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState(blankVitals);
  const [soap, setSoap] = useState(blankSoap);
  const [summary, setSummary] = useState('Dialysis completed successfully without complications.');
  const [docFiles, setDocFiles] = useState([]);
  const [docName, setDocName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const uploadDocs = async () => {
    if (!selected?._id || !docFiles.length) { toast.error('Select file(s) first'); return; }
    setUploadingDoc(true);
    try {
      await sessionApi.uploadDocuments(selected._id, { files: docFiles, name: docName });
      toast.success(`${docFiles.length} file(s) uploaded`);
      setDocFiles([]); setDocName('');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const sessionRes = await sessionApi.list(status ? { status } : {});
      setSessions(sessionRes.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const openSession = (session) => setSelected(session);

  const action = async (message, fn) => {
    try {
      await fn();
      toast.success(message);
      await load();
      if (selected?._id) {
        const latest = await sessionApi.list({ schedule: selected.schedule?._id || selected.schedule });
        setSelected((latest.data?.data || [])[0] || selected);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Action failed');
    }
  };

  const saveVitals = () => action('Vitals saved', () => sessionApi.vitals(selected._id, {
    ...vitals,
    heartRate: Number(vitals.heartRate),
    temperature: Number(vitals.temperature),
    weight: Number(vitals.weight),
    spo2: Number(vitals.spo2),
  }));

  const completeAndClean = async () => {
    await action('Session completed', () => sessionApi.complete(selected._id, { treatmentSummary: summary }));
    const chairCode = selected?.chair?.code || selected?.chair?.chairNumber;
    if (chairCode) {
      try {
        await chairClearanceApi.create(chairCode, { status: 'available', notes: 'Post-treatment chair cleaned and ready.', checklist: defaultChairChecklist });
        toast.success('Chair cleared and available');
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Chair clearance failed');
      }
    }
  };

  return <div className="space-y-5">
    <PageHeader title="Treatment Workflow" subtitle="Session check-in, start, vitals, SOAP, completion and chair cleaning." />
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div><label className="label">Session Status</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{['scheduled','checked_in','ready','in_progress','completed','cancelled','no_show'].map((s) => <option key={s}>{s}</option>)}</select></div>
      <button className="btn-light" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-3 lg:col-span-1">
        {sessions.map((s) => <button key={s._id} onClick={() => openSession(s)} className={`card w-full p-4 text-left transition ${selected?._id === s._id ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-start justify-between gap-2"><div><b>{personName(s.patient)}</b><p className="text-xs text-slate-500">{s.patient?.mrn} • Chair {s.chair?.code || s.chair?.chairNumber}</p><p className="text-xs text-slate-400">{dateOnly(s.createdAt)}</p></div><StatusBadge status={s.status} /></div>
        </button>)}
        {sessions.length === 0 && <EmptyState message="No sessions found" />}
      </section>
      <section className="lg:col-span-2">
        {!selected && <EmptyState message="Select a session to manage treatment workflow" />}
        {selected && <div className="space-y-4">
          <div className="card p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-bold">{personName(selected.patient)}</h2><p className="text-sm text-slate-500">Chair {selected.chair?.code || selected.chair?.chairNumber} • Schedule {selected.schedule?.code || selected.schedule?._id || selected.schedule}</p></div><StatusBadge status={selected.status} /></div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Created</span><b>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</b></div><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Started</span><b>{selected.startedAt ? new Date(selected.startedAt).toLocaleString() : '—'}</b></div><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Completed</span><b>{selected.completedAt ? new Date(selected.completedAt).toLocaleString() : '—'}</b></div></div>
            <div className="mt-4 flex flex-wrap gap-2"><button className="btn-light" onClick={() => action('Patient checked in', () => sessionApi.checkIn(selected._id))}>Check In</button><button className="btn-primary" onClick={() => action('Treatment started', () => sessionApi.start(selected._id))}>Start Treatment</button></div></div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card p-5"><h3 className="mb-3 font-bold">Add Vitals</h3><div className="grid gap-3 sm:grid-cols-2"><select className="input" value={vitals.phase} onChange={(e) => setVitals({ ...vitals, phase: e.target.value })}><option value="before">before</option><option value="during">during</option><option value="after">after</option></select><input className="input" placeholder="BP 120/80" value={vitals.bloodPressure} onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })} /><input className="input" type="number" placeholder="Heart Rate" value={vitals.heartRate} onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })} /><input className="input" type="number" placeholder="Temperature" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} /><input className="input" type="number" placeholder="Weight" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} /><input className="input" type="number" placeholder="SPO2" value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} /><button className="btn-primary sm:col-span-2" onClick={saveVitals}>Save Vitals</button></div></div>
            <div className="card p-5"><h3 className="mb-3 font-bold">SOAP + Complete</h3><div className="space-y-3">{Object.keys(soap).map((key) => <textarea key={key} className="input min-h-16" placeholder={key} value={soap[key]} onChange={(e) => setSoap({ ...soap, [key]: e.target.value })} />)}<button className="btn-light" onClick={() => action('SOAP saved', () => sessionApi.soap(selected._id, soap))}>Save SOAP</button><textarea className="input min-h-20" value={summary} onChange={(e) => setSummary(e.target.value)} /><button className="btn-primary" onClick={completeAndClean}>Complete + Clean Chair</button></div></div>
          </div>
          <div className="card p-5"><h3 className="mb-3 font-bold">Upload Documents / Photos</h3><p className="mb-3 text-sm text-slate-500">Attach files to this treatment session. They appear in the patient's Treatment tab.</p>
            <div className="grid gap-3 md:grid-cols-3"><input className="input md:col-span-1" placeholder="Document name (optional)" value={docName} onChange={(e) => setDocName(e.target.value)} /><input className="input md:col-span-2" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setDocFiles(Array.from(e.target.files || []))} /></div>
            <div className="mt-3 flex items-center gap-3">{!!docFiles.length && <span className="text-xs font-semibold text-blue-700">{docFiles.length} file(s) selected</span>}<button className="btn-primary" onClick={uploadDocs} disabled={uploadingDoc || !docFiles.length}>{uploadingDoc ? 'Uploading...' : 'Upload'}</button></div>
            {!!(selected.documents?.length) && <div className="mt-4 space-y-1 text-sm"><p className="font-semibold text-slate-700">Uploaded ({selected.documents.length}):</p>{selected.documents.map((d, i) => <p key={i} className="text-slate-500">• {d.name || d.fileUrl}</p>)}</div>}
          </div>
        </div>}
      </section>
    </div>
  </div>;
}
