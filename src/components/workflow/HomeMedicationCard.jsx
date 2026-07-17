import { X, Ban } from 'lucide-react';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '');
const roleLabel = (r) => (r ? r.replace('_', ' ') : '');

/**
 * Saved home-medications list (vertical cards), matching the dialysis
 * MedicationCard: Active / Stopped / Removed badge, added timestamp + author,
 * stop/removed trail, and Stop + Delete actions. Add + stop/delete only.
 */
export default function HomeMedicationCard({ homeMeds, allowHomeMed, onStop, onDelete }) {
  const isStopped = (m) => m.status === 'discontinued' || m.status === 'cancelled';
  const isRemoved = (m) => m.status === 'deleted';

  const active = homeMeds.filter((m) => m.status === 'active');
  const inactive = homeMeds.filter((m) => m.status !== 'active');

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Current home medications</h4>
        {homeMeds.length > 0 && <span className="text-xs font-semibold text-slate-400">{active.length} active · {homeMeds.length} total</span>}
      </div>

      {!homeMeds.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-sm font-semibold text-slate-500">No home medications recorded.</p>
          <p className="mt-1 text-xs text-slate-400">Add the patient&apos;s regular home medication using the form above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...active, ...inactive].map((m) => {
            const stopped = isStopped(m);
            const removed = isRemoved(m);
            return (
              <div key={m._id} className={`rounded-2xl border p-4 transition ${removed ? 'border-slate-200 bg-slate-50 opacity-70' : stopped ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-100 bg-emerald-50/70'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-extrabold ${removed ? 'text-slate-500 line-through' : stopped ? 'text-amber-900' : 'text-emerald-900'}`}>{m.name}</p>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${removed ? 'bg-slate-200 text-slate-600' : stopped ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                        {removed ? 'Removed' : stopped ? 'Stopped' : 'Active'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span><b>Dose:</b> {m.dose ?? '—'}{m.unit ? ` ${m.unit}` : ''}</span>
                      <span><b>Route:</b> {m.route || '—'}</span>
                      <span><b>Frequency:</b> {m.frequency || '—'}</span>
                      <span><b>Quantity:</b> {m.quantity || 1}</span>
                    </div>

                    {m.prescribedBy && <p className="mt-2 text-xs text-slate-500"><b>Prescribed by:</b> {m.prescribedBy}</p>}
                    {m.notes && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">{m.notes}</p>}

                    {/* Lifecycle trail */}
                    <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                      {(m.addedByName || m.addedAt || m.createdAt) && (
                        <p>Added{m.addedByName ? ` by ${m.addedByName}` : ''}{m.addedByRole ? ` (${roleLabel(m.addedByRole)})` : ''}{(m.addedAt || m.createdAt) ? ` • ${fmt(m.addedAt || m.createdAt)}` : ''}</p>
                      )}
                      {stopped && <p className="text-amber-600">Stopped{m.cancelledByName ? ` by ${m.cancelledByName}` : ''}{m.cancelledByRole ? ` (${roleLabel(m.cancelledByRole)})` : ''}{m.cancelledAt ? ` • ${fmt(m.cancelledAt)}` : ''}{m.cancelReason ? ` — ${m.cancelReason}` : ''}</p>}
                      {removed && <p className="text-slate-500">Removed{m.deletedByName ? ` by ${m.deletedByName}` : ''}{m.deletedByRole ? ` (${roleLabel(m.deletedByRole)})` : ''}{m.deletedAt ? ` • ${fmt(m.deletedAt)}` : ''}</p>}
                    </div>
                  </div>

                  {allowHomeMed && !removed && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button type="button" title={stopped ? 'Reactivate' : 'Stop medication'} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${stopped ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`} onClick={() => onStop(m)}>
                        <Ban size={12} /> {stopped ? 'Reactivate' : 'Stop'}
                      </button>
                      <button type="button" title="Delete home medication" className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100" onClick={() => onDelete(m)}>
                        <X size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
