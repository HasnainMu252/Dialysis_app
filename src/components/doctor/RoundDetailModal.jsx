import { X } from 'lucide-react';
import { ROUND_SECTIONS } from '../../constants/physicianRound';

const val = (v) => {
  if (v === true) return 'Yes';
  if (v === false || v === '' || v === null || v === undefined) return '—';
  return String(v);
};

export default function RoundDetailModal({ round, onClose }) {
  if (!round) return null;
  const pr = round.physicianRound || {};
  const vitals = round.vitals || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Round {round.roundNumber} — {round.month}/{round.year}</h3>
            <p className="text-xs text-slate-500">Doctor: {round.doctor?.name || round.doctor?.email || round.doctorName || '—'} · Status: {round.status} · Approval: {round.approval?.status || 'pending'}</p>
          </div>
          <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">Vitals</h4>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p><b>BP:</b> {val(vitals.bloodPressure)}</p>
              <p><b>Pulse:</b> {val(vitals.pulse)}</p>
              <p><b>Weight:</b> {val(vitals.weight)}</p>
            </div>
          </div>

          {ROUND_SECTIONS.map((section) => (
            <div key={section.key}>
              <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">{section.title}</h4>
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((f) => (
                  <p key={f.key}><b>{f.label}:</b> {val(pr[section.key]?.[f.key])}</p>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">Comments</h4>
            <div className="space-y-1 text-sm">
              <p><b>Doctor:</b> {val(round.doctorComments || round.soap?.doctorNotes)}</p>
              <p><b>Social Worker:</b> {val(round.socialWorkerComments)}</p>
              <p><b>Dietitian:</b> {val(round.dietitianComments)}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">CQI</h4>
            <div className="space-y-1 text-sm">
              <p><b>Patient:</b> {val(round.cqi?.patient)}</p>
              <p><b>Social:</b> {val(round.cqi?.social)}</p>
              <p><b>Dietitian:</b> {val(round.cqi?.dietitian)}</p>
            </div>
          </div>

          {!!(round.documents?.length) && (
            <div>
              <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">Documents ({round.documents.length})</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {round.documents.map((d, i) => <span key={i} className="rounded-lg bg-slate-100 px-2 py-1">{d.name || `Document ${i + 1}`}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
