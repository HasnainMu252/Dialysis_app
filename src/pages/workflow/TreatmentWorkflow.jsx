import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sessionApi } from '../../api/sessionApi';
import { medicationApi, MEDICATION_ROUTES, COMMON_UNITS } from '../../api/medicationApi';
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
  const [meds, setMeds] = useState([{ name: '', dose: '', unit: 'mg', route: 'IV', quantity: 1, notes: '' }]);
  const [savingMeds, setSavingMeds] = useState(false);

  const QUICK_MEDS = [
    { name: 'Epogen', dose: 5000, unit: 'Units', route: 'IV' },
    { name: 'Heparin', dose: 3000, unit: 'Units', route: 'IV' },
    { name: 'Venofer', dose: 100, unit: 'mg', route: 'IV' },
    { name: 'Calcitriol', dose: 0.5, unit: 'mcg', route: 'IV' },
    { name: 'Benadryl', dose: 25, unit: 'mg', route: 'IV' },
    { name: 'Oxygen', dose: 30, unit: 'min', route: 'Inhaled' },
    { name: 'LiquaCel', dose: 30, unit: 'ml', route: 'Oral' },
  ];

  const setMedField = (i, key, val) => setMeds((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addMedRow = (preset) => setMeds((rows) => [...rows, preset ? { ...preset, quantity: 1, notes: '' } : { name: '', dose: '', unit: 'mg', route: 'IV', quantity: 1, notes: '' }]);
  const removeMedRow = (i) => setMeds((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const saveMeds = async () => {
    const valid = meds.filter((m) => m.name.trim());
    if (!valid.length) { toast.error('Add at least one medication'); return; }
    setSavingMeds(true);
    try {
      await medicationApi.recordForSession(selected._id, valid.map((m) => ({ ...m, dose: Number(m.dose) || 0, quantity: Number(m.quantity) || 1 })));
      toast.success(`Recorded ${valid.length} medication(s)`);
      setMeds([{ name: '', dose: '', unit: 'mg', route: 'IV', quantity: 1, notes: '' }]);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to record medications');
    } finally {
      setSavingMeds(false);
    }
  };
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

  const [sessionMeds, setSessionMeds] = useState([]);
  const openSession = (session) => {
    setSelected(session);
    setSessionMeds([]);
    if (session?._id) {
      medicationApi.list({ session: session._id }).then((r) => setSessionMeds(r.data?.data || [])).catch(() => setSessionMeds([]));
    }
  };

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
        {selected && (() => {
          const st = String(selected.status || '').toLowerCase();
          const isScheduled = st === 'scheduled' || st === 'ready';
          const isCheckedIn = st === 'checked_in';
          const isInProgress = st === 'in_progress';
          const isCompleted = st === 'completed';
          const durationMin = selected.startedAt && selected.completedAt ? Math.round((new Date(selected.completedAt) - new Date(selected.startedAt)) / 60000) : null;
          const nurseName = selected.assignedNurse?.name || selected.nurse?.name || selected.startedBy?.name || '—';
          return (
          <div className="space-y-4">
          <div className="card p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-bold">{personName(selected.patient)}</h2><p className="text-sm text-slate-500">Chair {selected.chair?.code || selected.chair?.chairNumber} • Schedule {selected.schedule?.code || selected.schedule?._id || selected.schedule}</p></div><StatusBadge status={selected.status} /></div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Created</span><b>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</b></div><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Started</span><b>{selected.startedAt ? new Date(selected.startedAt).toLocaleString() : '—'}</b></div><div className="rounded-xl bg-slate-50 p-2"><span className="block font-semibold text-slate-400">Completed</span><b>{selected.completedAt ? new Date(selected.completedAt).toLocaleString() : '—'}</b></div></div>
            {isScheduled && <div className="mt-4"><button className="btn-primary" onClick={() => action('Patient checked in', () => sessionApi.checkIn(selected._id))}>Check In</button></div>}
            {isCheckedIn && <div className="mt-4"><button className="btn-primary" onClick={() => action('Treatment started', () => sessionApi.start(selected._id))}>Start Treatment</button></div>}
            {isCompleted && <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">This treatment is completed. The summary below is read-only.</div>}
          </div>

          {isInProgress && <>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card p-5"><h3 className="mb-3 font-bold">Add Vitals</h3><div className="grid gap-3 sm:grid-cols-2"><select className="input" value={vitals.phase} onChange={(e) => setVitals({ ...vitals, phase: e.target.value })}><option value="before">before</option><option value="during">during</option><option value="after">after</option></select><input className="input" placeholder="BP 120/80" value={vitals.bloodPressure} onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })} /><input className="input" type="number" placeholder="Heart Rate" value={vitals.heartRate} onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })} /><input className="input" type="number" placeholder="Temperature" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} /><input className="input" type="number" placeholder="Weight" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} /><input className="input" type="number" placeholder="SPO2" value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} /><button className="btn-primary sm:col-span-2" onClick={saveVitals}>Save Vitals</button></div></div>
            <div className="card p-5"><h3 className="mb-3 font-bold">SOAP + Complete</h3><div className="space-y-3">{Object.keys(soap).map((key) => <textarea key={key} className="input min-h-16" placeholder={key} value={soap[key]} onChange={(e) => setSoap({ ...soap, [key]: e.target.value })} />)}<button className="btn-light" onClick={() => action('SOAP saved', () => sessionApi.soap(selected._id, soap))}>Save SOAP</button><textarea className="input min-h-20" value={summary} onChange={(e) => setSummary(e.target.value)} /><button className="btn-primary" onClick={completeAndClean}>Complete + Clean Chair</button></div></div>
          </div>
          <div className="card p-5"><h3 className="mb-1 font-bold">Medication Administration</h3><p className="mb-3 text-sm text-slate-500">Record every medication given during this session. Saved entries feed the patient's medication history, reports and billing.</p>
            <div className="mb-3 flex flex-wrap gap-2">{QUICK_MEDS.map((qm) => <button key={qm.name} type="button" className="btn-light text-xs" onClick={() => addMedRow(qm)}>+ {qm.name} {qm.dose}{qm.unit === 'min' ? ' min' : ` ${qm.unit}`}</button>)}</div>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2 md:grid-cols-12">
                  <input className="input md:col-span-3" placeholder="Medication name" value={m.name} onChange={(e) => setMedField(i, 'name', e.target.value)} />
                  <input className="input md:col-span-2" type="number" placeholder="Dose" value={m.dose} onChange={(e) => setMedField(i, 'dose', e.target.value)} />
                  <select className="input md:col-span-2" value={m.unit} onChange={(e) => setMedField(i, 'unit', e.target.value)}>{COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                  <select className="input md:col-span-2" value={m.route} onChange={(e) => setMedField(i, 'route', e.target.value)}>{MEDICATION_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                  <input className="input md:col-span-2" type="number" placeholder="Qty" value={m.quantity} onChange={(e) => setMedField(i, 'quantity', e.target.value)} />
                  <button type="button" className="btn-light md:col-span-1 text-red-600" onClick={() => removeMedRow(i)}>✕</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-light" onClick={() => addMedRow()}>+ Add row</button><button type="button" className="btn-primary" onClick={saveMeds} disabled={savingMeds}>{savingMeds ? 'Saving…' : 'Save Medications'}</button></div>
          </div>
          <div className="card p-5"><h3 className="mb-3 font-bold">Upload Documents / Photos</h3><p className="mb-3 text-sm text-slate-500">Attach files to this treatment session. They appear in the patient's Treatment tab.</p>
            <div className="grid gap-3 md:grid-cols-3"><input className="input md:col-span-1" placeholder="Document name (optional)" value={docName} onChange={(e) => setDocName(e.target.value)} /><input className="input md:col-span-2" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setDocFiles(Array.from(e.target.files || []))} /></div>
            <div className="mt-3 flex items-center gap-3">{!!docFiles.length && <span className="text-xs font-semibold text-blue-700">{docFiles.length} file(s) selected</span>}<button className="btn-primary" onClick={uploadDocs} disabled={uploadingDoc || !docFiles.length}>{uploadingDoc ? 'Uploading...' : 'Upload'}</button></div>
            {!!(selected.documents?.length) && <div className="mt-4 space-y-1 text-sm"><p className="font-semibold text-slate-700">Uploaded ({selected.documents.length}):</p>{selected.documents.map((d, i) => <p key={i} className="text-slate-500">• {d.name || d.fileUrl}</p>)}</div>}
          </div>
          </>}

          {isCompleted && (
            <div className="card space-y-4 p-5">
              <h3 className="text-lg font-extrabold text-slate-900">Treatment Summary (read-only)</h3>
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <p><b>Patient:</b> {personName(selected.patient)}</p>
                <p><b>MRN:</b> {selected.patient?.mrn || '—'}</p>
                <p><b>Chair:</b> {selected.chair?.code || selected.chair?.chairNumber || '—'}</p>
                <p><b>Start:</b> {selected.startedAt ? new Date(selected.startedAt).toLocaleString() : '—'}</p>
                <p><b>End:</b> {selected.completedAt ? new Date(selected.completedAt).toLocaleString() : '—'}</p>
                <p><b>Duration:</b> {durationMin != null ? `${durationMin} min` : '—'}</p>
                <p><b>Nurse:</b> {nurseName}</p>
                <p><b>Status:</b> {selected.status}</p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-extrabold uppercase text-blue-800">Medications ({sessionMeds.length})</h4>
                {sessionMeds.length ? <div className="flex flex-wrap gap-2">{sessionMeds.map((m) => <span key={m._id} className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">✓ {m.name} {m.dose}{m.unit === 'min' ? ' min' : ` ${m.unit}`}{m.route ? ` · ${m.route}` : ''}</span>)}</div> : <p className="text-sm text-slate-400">None recorded.</p>}
              </div>
              <div>
                <h4 className="mb-1 text-xs font-extrabold uppercase text-blue-800">Vitals ({selected.vitals?.length || 0})</h4>
                {selected.vitals?.length ? selected.vitals.map((v, i) => <p key={i} className="text-sm text-slate-600">BP {v.bloodPressure || '—'} · HR {v.heartRate || '—'} · Temp {v.temperature || '—'} · Weight {v.weight || '—'} · SPO2 {v.spo2 || '—'}</p>) : <p className="text-sm text-slate-400">None recorded.</p>}
              </div>
              <div>
                <h4 className="mb-1 text-xs font-extrabold uppercase text-blue-800">SOAP</h4>
                {selected.soapNotes?.length ? selected.soapNotes.map((s, i) => <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><p><b>S:</b> {s.subjective || '—'}</p><p><b>O:</b> {s.objective || '—'}</p><p><b>A:</b> {s.assessment || '—'}</p><p><b>P:</b> {s.plan || '—'}</p></div>) : <p className="text-sm text-slate-400">No SOAP recorded.</p>}
              </div>
              {selected.treatmentSummary && <p className="text-sm text-slate-600"><b>Summary:</b> {selected.treatmentSummary}</p>}
              {!!(selected.documents?.length) && <div><h4 className="mb-1 text-xs font-extrabold uppercase text-blue-800">Documents</h4><div className="flex flex-wrap gap-2 text-sm text-slate-600">{selected.documents.map((d, i) => <span key={i} className="rounded-lg bg-slate-100 px-2 py-1">{d.name || `Document ${i + 1}`}</span>)}</div></div>}
            </div>
          )}
          </div>
          );
        })()}
      </section>
    </div>
  </div>;
}
