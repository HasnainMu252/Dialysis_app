import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { medicationApi } from '../../api/medicationApi';

const ts = (d) => (d ? new Date(d).toLocaleString() : '—');

export default function SessionDetailModal({ session, onClose }) {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?._id) return;
    setLoading(true);
    medicationApi.list({ session: session._id })
      .then((r) => setMeds(r.data?.data || []))
      .catch(() => setMeds([]))
      .finally(() => setLoading(false));
  }, [session?._id]);

  if (!session) return null;
  const vitals = session.vitals || [];
  const soaps = session.soapNotes || [];
  const docs = session.documents || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Dialysis Session Detail</h3>
            <p className="text-xs text-slate-500">{session.status} · Chair {session.chair?.code || session.chair?.chairNumber || '—'}</p>
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
                  <p><b>S:</b> {s.subjective || '—'}</p><p><b>O:</b> {s.objective || '—'}</p>
                  <p><b>A:</b> {s.assessment || '—'}</p><p><b>P:</b> {s.plan || '—'}</p>
                </div>
              ))}
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
  );
}
