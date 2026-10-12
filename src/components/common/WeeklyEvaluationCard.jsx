import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { WEEKLY_SECTIONS, WEEKLY_LABELS } from '../../constants/weeklyEvaluation';
import { toDateInput } from '../../utils/accessAge';
import NoteAuthor from './NoteAuthor';

const EDIT_ROLES = ['admin', 'doctor', 'nurse'];
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';

const blankData = () => {
  const d = {};
  WEEKLY_SECTIONS.forEach((s) => s.fields.forEach((f) => { d[f.key] = f.type === 'check' ? false : ''; }));
  return d;
};

// Summarise a saved evaluation's checked/selected items for the history list.
function summarise(data = {}) {
  return Object.entries(data)
    .filter(([, v]) => v === true || (typeof v === 'string' && v))
    .map(([k, v]) => (v === true ? WEEKLY_LABELS[k] : `${WEEKLY_LABELS[k]}: ${v}`))
    .filter(Boolean);
}

export default function WeeklyEvaluationCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const evals = useMemo(
    () => [...(patient?.weeklyEvaluations || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [patient?.weeklyEvaluations]
  );

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [data, setData] = useState(blankData);
  const [open, setOpen] = useState(null);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await patientApi.addWeeklyEvaluation(patient._id, { date: date || undefined, data });
      toast.success('Weekly evaluation saved');
      setAdding(false);
      setData(blankData());
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Weekly Dialysis Evaluation</h2>
        {canEdit && !adding && <button type="button" onClick={() => setAdding(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">New evaluation</button>}
      </div>

      {adding && (
        <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/30 p-4">
          <label className="flex max-w-xs flex-col gap-1"><span className={label}>Date</span><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          {WEEKLY_SECTIONS.map((s) => (
            <div key={s.key} className="rounded-xl border border-slate-200 bg-white p-3">
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">{s.title}</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {s.fields.map((f) => (
                  f.type === 'check' ? (
                    <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={!!data[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      {f.label}
                    </label>
                  ) : (
                    <label key={f.key} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">{f.label}</span>
                      <select className={inputCls} value={data[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                        {f.options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                      </select>
                    </label>
                  )
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save evaluation'}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {evals.length === 0 && <p className="text-sm text-slate-400">No weekly evaluations recorded yet.</p>}
        {evals.map((ev) => {
          const isOpen = open === ev._id;
          const items = summarise(ev.data);
          return (
            <div key={ev._id} className="rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => setOpen(isOpen ? null : ev._id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div>
                  <span className="font-semibold text-slate-800">{new Date(ev.date).toLocaleDateString()}</span>
                  <NoteAuthor name={ev.authorName} role={ev.authorRole} at={ev.createdAt} />
                </div>
                <span className="text-xs font-bold text-blue-700">{items.length} item(s) {isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3">
                  {items.length === 0 ? <p className="text-sm text-slate-400">Nothing checked.</p> : (
                    <ul className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                      {items.map((t, i) => <li key={i}>✓ {t}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
