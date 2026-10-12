import { useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { accessAge, toDateInput } from '../../utils/accessAge';

/*
 * Fistula / catheter access with derived age. View for everyone who can see the
 * patient; inline edit for nurse, doctor and admin (they maintain access even
 * though they can't edit the rest of the patient record).
 */

const EDIT_ROLES = ['admin', 'nurse', 'doctor'];

const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';

const blankLine = { present: false, type: '', site: '', placementDate: '', ageText: '', note: '' };

function toForm(va = {}) {
  const line = (l = {}) => ({ ...blankLine, ...l, placementDate: toDateInput(l.placementDate) });
  return { fistula: line(va.fistula), catheter: line(va.catheter) };
}

function ReadLine({ title, line }) {
  const l = line || {};
  const has = l.present || l.type || l.site || l.placementDate || l.ageText || l.note;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
          Age: {accessAge(l.placementDate, l.ageText)}
        </span>
      </div>
      {has ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><dt className="text-xs text-slate-400">Type</dt><dd className="text-slate-700">{l.type || '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">Site</dt><dd className="text-slate-700">{l.site || '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">Placement</dt><dd className="text-slate-700">{l.placementDate ? toDateInput(l.placementDate) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">In use</dt><dd className="text-slate-700">{l.present ? 'Yes' : 'No'}</dd></div>
          {l.note ? <div className="col-span-2"><dt className="text-xs text-slate-400">Note</dt><dd className="text-slate-700">{l.note}</dd></div> : null}
        </dl>
      ) : (
        <p className="text-sm text-slate-400">Not recorded.</p>
      )}
    </div>
  );
}

function EditLine({ title, line, onChange }) {
  const set = (k, v) => onChange({ ...line, [k]: v });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={!!line.present} onChange={(e) => set('present', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          In use
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className={label}>Type</span><input className={inputCls} value={line.type} onChange={(e) => set('type', e.target.value)} placeholder="AV Fistula / Catheter" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Site</span><input className={inputCls} value={line.site} onChange={(e) => set('site', e.target.value)} placeholder="Left Upper Arm" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Placement Date</span><input type="date" className={inputCls} value={line.placementDate} onChange={(e) => set('placementDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className={label}>Age (if no date)</span><input className={inputCls} value={line.ageText} onChange={(e) => set('ageText', e.target.value)} placeholder="e.g. 2y" /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className={label}>Note</span><input className={inputCls} value={line.note} onChange={(e) => set('note', e.target.value)} /></label>
      </div>
    </div>
  );
}

export default function VascularAccessCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(patient?.vascularAccess));

  const startEdit = () => {
    setForm(toForm(patient?.vascularAccess));
    setEditing(true);
  };

  const save = async () => {
    if (!patient?._id) return;
    setSaving(true);
    try {
      const payload = {
        fistula: { ...form.fistula, placementDate: form.fistula.placementDate || undefined },
        catheter: { ...form.catheter, placementDate: form.catheter.placementDate || undefined },
      };
      const res = await patientApi.updateVascularAccess(patient._id, payload);
      toast.success('Vascular access updated');
      setEditing(false);
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const va = patient?.vascularAccess || {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Vascular Access</h3>
          <p className="text-xs text-slate-500">Fistula and catheter — age is derived from the placement date.</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <EditLine title="Fistula" line={form.fistula} onChange={(l) => setForm((f) => ({ ...f, fistula: l }))} />
            <EditLine title="Catheter" line={form.catheter} onChange={(l) => setForm((f) => ({ ...f, catheter: l }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReadLine title="Fistula" line={va.fistula} />
            <ReadLine title="Catheter" line={va.catheter} />
          </div>
          {va.updatedByName && (
            <p className="mt-3 text-xs text-slate-400">Last updated by {va.updatedByName}</p>
          )}
        </>
      )}
    </div>
  );
}
