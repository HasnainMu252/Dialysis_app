import { X, Ban } from 'lucide-react';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '');
const roleLabel = (r) => (r ? r.replace('_', ' ') : '');

/**
 * Medication Administration card (vertical layout).
 * - Entry rows are stacked vertically (label + field per line).
 * - Saved meds show a lifecycle badge (Active / Cancelled / Removed) with the
 *   who + when trail, a Cancel (stop) action and a Delete (soft) action.
 * Add + delete/cancel only — no in-place edit.
 */
export default function MedicationCard({
  allowMeds,
  quickMeds,
  units,
  routes,
  meds,
  sessionMeds,
  savingMeds,
  onMedField,
  onAddRow,
  onRemoveRow,
  onSave,
  onDelete,
  onCancel,
}) {
  const active = sessionMeds.filter((m) => (m.status || 'active') === 'active');
  const inactive = sessionMeds.filter((m) => (m.status || 'active') !== 'active');

  const Field = ({ label, children }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900">Medication Administration</h3>
          <p className="mt-1 text-sm text-slate-500">
            {allowMeds ? 'Record medications administered during this dialysis session.' : 'View only — medications are recorded by a nurse or doctor.'}
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
          {active.length} active
        </span>
      </div>

      {allowMeds && (
        <>
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Quick medications</p>
            <div className="flex flex-wrap gap-2">
              {quickMeds.map((m) => (
                <button key={m.name} type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100" onClick={() => onAddRow(m)}>
                  + {m.name} {m.dose} {m.unit}
                </button>
              ))}
            </div>
          </div>

          {/* Vertical medication entry rows */}
          <div className="mt-5 space-y-3">
            {meds.map((m, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-800">Medication {index + 1}</p>
                  <button type="button" title="Remove row" className="rounded-full p-2 text-slate-400 transition hover:bg-red-100 hover:text-red-600" onClick={() => onRemoveRow(index)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <Field label="Medication name">
                    <input className="input w-full" placeholder="e.g. Heparin" value={m.name} onChange={(e) => onMedField(index, 'name', e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Dose"><input className="input w-full" type="number" min="0" step="any" value={m.dose} onChange={(e) => onMedField(index, 'dose', e.target.value)} /></Field>
                    <Field label="Unit"><select className="input w-full" value={m.unit} onChange={(e) => onMedField(index, 'unit', e.target.value)}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
                    <Field label="Route"><select className="input w-full" value={m.route} onChange={(e) => onMedField(index, 'route', e.target.value)}>{routes.map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
                    <Field label="Qty"><input className="input w-full" type="number" min="1" value={m.quantity} onChange={(e) => onMedField(index, 'quantity', e.target.value)} /></Field>
                  </div>
                  <Field label="Notes (optional)">
                    <input className="input w-full" placeholder="Notes" value={m.notes} onChange={(e) => onMedField(index, 'notes', e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-light" onClick={() => onAddRow()}>+ Add Another Medication</button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={savingMeds}>{savingMeds ? 'Saving medications...' : 'Save Medications'}</button>
          </div>
        </>
      )}

      {/* Saved medications — vertical list with lifecycle */}
      <div className={allowMeds ? 'mt-6 border-t border-slate-100 pt-5' : 'mt-4'}>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Medications this session ({sessionMeds.length})</h4>

        {!sessionMeds.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">No medication has been recorded.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...active, ...inactive].map((m) => {
              const status = m.status || 'active';
              const cancelled = status === 'cancelled';
              const removed = status === 'deleted';
              return (
                <div key={m._id} className={`rounded-2xl border p-4 ${removed ? 'border-slate-200 bg-slate-50 opacity-70' : cancelled ? 'border-amber-200 bg-amber-50/70' : 'border-blue-100 bg-blue-50/70'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-extrabold ${removed ? 'text-slate-500 line-through' : cancelled ? 'text-amber-900' : 'text-blue-900'}`}>{m.name}</p>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${removed ? 'bg-slate-200 text-slate-600' : cancelled ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                          {removed ? 'Removed' : cancelled ? 'Cancelled' : 'Active'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span><b>Dose:</b> {m.dose ?? '—'}{m.unit ? ` ${m.unit}` : ''}</span>
                        <span><b>Route:</b> {m.route || '—'}</span>
                        <span><b>Qty:</b> {m.quantity || 1}</span>
                      </div>
                      {m.notes && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">{m.notes}</p>}

                      {/* Lifecycle trail */}
                      <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                        {(m.addedByName || m.givenByName || m.addedAt || m.createdAt) && (
                          <p>Added{(m.addedByName || m.givenByName) ? ` by ${m.addedByName || m.givenByName}` : ''}{m.addedByRole ? ` (${roleLabel(m.addedByRole)})` : ''}{(m.addedAt || m.createdAt) ? ` • ${fmt(m.addedAt || m.createdAt)}` : ''}</p>
                        )}
                        {cancelled && <p className="text-amber-600">Stopped{m.cancelledByName ? ` by ${m.cancelledByName}` : ''}{m.cancelledByRole ? ` (${roleLabel(m.cancelledByRole)})` : ''}{m.cancelledAt ? ` • ${fmt(m.cancelledAt)}` : ''}{m.cancelReason ? ` — ${m.cancelReason}` : ''}</p>}
                        {removed && <p className="text-slate-500">Removed{m.deletedByName ? ` by ${m.deletedByName}` : ''}{m.deletedByRole ? ` (${roleLabel(m.deletedByRole)})` : ''}{m.deletedAt ? ` • ${fmt(m.deletedAt)}` : ''}</p>}
                      </div>
                    </div>

                    {allowMeds && !removed && (
                      <div className="flex shrink-0 flex-col gap-1">
                        {!cancelled && (
                          <button type="button" title="Stop / cancel medication" className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100" onClick={() => onCancel(m)}>
                            <Ban size={12} /> Stop
                          </button>
                        )}
                        <button type="button" title="Delete medication" className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100" onClick={() => onDelete(m)}>
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
    </section>
  );
}
