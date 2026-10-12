import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { medicationApi } from '../../api/medicationApi';
import { homeMedicationApi } from '../../api/homeMedicationApi';
import NoteAuthor from './NoteAuthor';
import Portal from './Portal';
import { accessAge } from '../../utils/accessAge';

const ts = (d) => (d ? new Date(d).toLocaleString() : '—');
const hasAny = (obj) => obj && Object.values(obj).some((v) => v !== '' && v !== false && v != null);

export default function SessionDetailModal({ session, onClose }) {
  const [meds, setMeds] = useState([]);
  const [homeMeds, setHomeMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?._id) return;
    setLoading(true);
    medicationApi.list({ session: session._id })
      .then((r) => setMeds(r.data?.data || []))
      .catch(() => setMeds([]))
      .finally(() => setLoading(false));
    const patientRef = session.patient?._id || session.patient;
    if (patientRef) {
      homeMedicationApi.list(patientRef)
        .then((r) => setHomeMeds(r.data?.data || []))
        .catch(() => setHomeMeds([]));
    }
  }, [session?._id]);

  if (!session) return null;
  const vitals = session.vitals || [];
  const soaps = session.soapNotes || [];
  const notes = session.technicianNotes || [];
  const docs = session.documents || [];
  const va = session.patient?.vascularAccess || {};
  const fs = session.flowSheet || {};
  const mc = fs.machineCheck || {};
  const aa = fs.accessAssessment || {};
  const accessList = fs.accessList || [];
  const hasFlowSheet = hasAny(mc) || hasAny(aa) || accessList.length > 0 || hasAny(fs.solutionMixing);

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Dialysis Session Detail</h3>
            <p className="text-xs text-slate-500">{session.status} · Station {session.chair?.code || session.chair?.chairNumber || '—'}</p>
          </div>
          <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="space-y-5 p-5 text-sm">
          <div>
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Timeline</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <p><b>Booked / created:</b> {ts(session.createdAt)}</p>
              <p><b>Checked in:</b> {ts(session.checkedInAt)}</p>
              <p><b>Started:</b> {ts(session.startedAt)}</p>
              <p><b>Completed:</b> {ts(session.completedAt)}</p>
            </div>
          </div>

          {(hasAny(va.fistula) || hasAny(va.catheter)) && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Vascular Access</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <p><b>Fistula:</b> {va.fistula?.type || '—'}{va.fistula?.site ? ` · ${va.fistula.site}` : ''} · Age {accessAge(va.fistula?.placementDate, va.fistula?.ageText)}</p>
                <p><b>Catheter:</b> {va.catheter?.type || '—'}{va.catheter?.site ? ` · ${va.catheter.site}` : ''} · Age {accessAge(va.catheter?.placementDate, va.catheter?.ageText)}</p>
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Medications given ({meds.length})</h4>
            {loading ? <p className="text-slate-400">Loading…</p> : (
              meds.length ? (
                <div className="flex flex-wrap gap-2">
                  {meds.map((m) => (
                    <span key={m._id} className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">✓ {m.name} {m.dose}{m.unit === 'min' ? ' min' : ` ${m.unit}`}{m.route ? ` · ${m.route}` : ''}</span>
                  ))}
                </div>
              ) : <p className="text-slate-400">No medications recorded for this session.</p>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-emerald-800">Home medications ({homeMeds.length})</h4>
            {homeMeds.length ? (
              <div className="flex flex-wrap gap-2">
                {homeMeds.map((m) => (
                  <span key={m._id} className={`rounded-lg px-2.5 py-1 font-semibold ${m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'}`}>{m.name} {m.dose}{m.unit ? ` ${m.unit}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}</span>
                ))}
              </div>
            ) : <p className="text-slate-400">No home medications on file for this patient.</p>}
          </div>

          {!!vitals.length && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Vitals ({vitals.length})</h4>
              <div className="space-y-1">
                {vitals.map((v, i) => (
                  <p key={i} className="text-slate-600">BP {v.bloodPressure || '—'} · Pulse {v.pulse || '—'} · Temp {v.temperature || '—'} · Weight {v.weight || '—'}</p>
                ))}
              </div>
            </div>
          )}

          {!!soaps.length && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">SOAP notes</h4>
              {soaps.map((s, i) => (
                <div key={i} className="mb-2 rounded-xl bg-slate-50 p-3 text-slate-600">
                  {(s.access || s.accessOther) && <p className="mb-1"><span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">Access: {s.access === 'Other' && s.accessOther ? s.accessOther : s.access}</span></p>}
                  <p><b>S:</b> {s.subjective || '—'}</p><p><b>O:</b> {s.objective || '—'}</p>
                  <p><b>A:</b> {s.assessment || '—'}</p><p><b>P:</b> {s.plan || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {!!notes.length && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-amber-700">Session notes / comments ({notes.length})</h4>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={n._id || i} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    {n.accessType && <span className="mr-2 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{n.accessType}</span>}
                    <span className="text-slate-700">{n.comment}</span>
                    <NoteAuthor name={n.authorName} role={n.authorRole} at={n.createdAt} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasFlowSheet && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Flow Sheet</h4>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-slate-600">
                {hasAny(mc) && (
                  <p>
                    <b>Machine:</b> {mc.machineBrand || '—'}{mc.machineNo ? ` #${mc.machineNo}` : ''} · Cond {mc.conductivityMachine || '—'}/{mc.conductivityMeter || '—'} · Temp {mc.temperature || '—'} · pH {mc.ph || '—'}
                    {(mc.alarmTest || mc.airDetector || mc.pressureTestMachine || mc.pressureCheckDialyzer) ? ` · Checks: Alarm ${mc.alarmTest || '—'}, Air ${mc.airDetector || '—'}, Press(M) ${mc.pressureTestMachine || '—'}, Press(D) ${mc.pressureCheckDialyzer || '—'}` : ''}
                  </p>
                )}
                {accessList.map((a, i) => (
                  <p key={a._id || i}><b>Access:</b> {a.type || '—'}{a.site ? ` · ${a.site}` : ''}{a.bloodFlowRate ? ` · BFR ${a.bloodFlowRate}` : ''}{a.inUse ? ' · in use' : ''}</p>
                ))}
                {hasAny(aa) && (
                  <p><b>Assessment:</b> Bruit {aa.bruit || '—'} · Thrill {aa.thrill || '—'} · Swelling {aa.extremitySwelling || '—'} · Soft-tissue infection {aa.softTissueInfection || '—'}</p>
                )}
                {fs.updatedByName && <p className="text-xs text-slate-400">Recorded by {fs.updatedByName}{fs.updatedByRole ? ` (${fs.updatedByRole})` : ''}</p>}
              </div>
            </div>
          )}

          {session.treatmentSummary && (
            <div><h4 className="mb-1 text-xs font-extrabold uppercase tracking-wide text-blue-800">Summary</h4><p className="text-slate-600">{session.treatmentSummary}</p></div>
          )}

          {!!docs.length && (
            <div>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-blue-800">Documents ({docs.length})</h4>
              <div className="flex flex-wrap gap-2 text-slate-600">{docs.map((d, i) => <span key={i} className="rounded-lg bg-slate-100 px-2 py-1">{d.name || `Document ${i + 1}`}</span>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}
