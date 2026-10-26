import { useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { accessAge, toDateInput } from '../../utils/accessAge';
import { ACCESS_TYPES, ACCESS_LOCATIONS, ACCESS_STATUSES, accessTypeLabel } from '../../constants/vascularAccess';

/*
 * A patient has ONE vascular access. View for everyone who can see the patient;
 * inline edit for nurse, doctor and admin. Captures access type, location,
 * status, placement date, last maintenance/assessment date and complications.
 * Legacy fistula/catheter records are shown read-only if present.
 */

const EDIT_ROLES = ['admin', 'nurse', 'doctor'];

const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#123B5D] focus:ring-2 focus:ring-[#123B5D]/10';

const STATUS_COLOR = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-slate-100 text-slate-600',
  Failed: 'bg-red-100 text-red-700',
  'Under Maturation': 'bg-amber-100 text-amber-700',
};

const blankForm = {
  accessType: '', location: '', status: '', placementDate: '', lastAssessmentDate: '', ageText: '', complications: '', note: '',
};

function toForm(va = {}) {
  return {
    ...blankForm,
    accessType: va.accessType || '',
    location: va.location || '',
    status: va.status || '',
    placementDate: toDateInput(va.placementDate),
    lastAssessmentDate: toDateInput(va.lastAssessmentDate),
    ageText: va.ageText || '',
    complications: va.complications || '',
    note: va.note || '',
  };
}

function View({ title, value }) {
  return (
    <div><dt className="text-xs text-slate-400">{title}</dt><dd className="text-slate-700">{value || '—'}</dd></div>
  );
}

// Read-only view of a legacy fistula/catheter line (only shown if data exists).
function LegacyLine({ title, line }) {
  const l = line || {};
  if (!(l.present || l.type || l.site || l.placementDate || l.ageText || l.note)) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <p className="mb-1 text-xs font-bold text-slate-500">{title} (legacy)</p>
      <p className="text-slate-700">{[l.type, l.site, l.placementDate ? toDateInput(l.placementDate) : null].filter(Boolean).join(' • ') || '—'}</p>
    </div>
  );
}

export default function VascularAccessCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(patient?.vascularAccess));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = () => {
    setForm(toForm(patient?.vascularAccess));
    setEditing(true);
  };

  const save = async () => {
    if (!patient?._id) return;
    setSaving(true);
    try {
      const res = await patientApi.updateVascularAccess(patient._id, {
        accessType: form.accessType,
        location: form.location,
        status: form.status,
        placementDate: form.placementDate || undefined,
        lastAssessmentDate: form.lastAssessmentDate || undefined,
        ageText: form.ageText,
        complications: form.complications,
        note: form.note,
      });
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
  const hasRecord = va.accessType || va.location || va.status || va.placementDate || va.lastAssessmentDate || va.complications || va.note;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Vascular Access</h3>
          <p className="text-xs text-slate-500">One access per patient — age is derived from the placement date.</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#123B5D] transition hover:bg-blue-50">
            {hasRecord ? 'Edit' : 'Add access'}
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1"><span className={label}>Access Type</span>
              <select className={inputCls} value={form.accessType} onChange={(e) => set('accessType', e.target.value)}>
                <option value="">Select access type…</option>
                {ACCESS_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className={label}>Access Location</span>
              <select className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)}>
                <option value="">Select location…</option>
                {ACCESS_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className={label}>Access Status</span>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="">Select status…</option>
                {ACCESS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className={label}>Placement Date</span><input type="date" className={inputCls} value={form.placementDate} onChange={(e) => set('placementDate', e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className={label}>Last Assessment / Maintenance</span><input type="date" className={inputCls} value={form.lastAssessmentDate} onChange={(e) => set('lastAssessmentDate', e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className={label}>Age (if no placement date)</span><input className={inputCls} value={form.ageText} onChange={(e) => set('ageText', e.target.value)} placeholder="e.g. 2y" /></label>
            <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3"><span className={label}>Complications</span><input className={inputCls} value={form.complications} onChange={(e) => set('complications', e.target.value)} placeholder="e.g. stenosis, thrombosis, infection" /></label>
            <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3"><span className={label}>Note</span><input className={inputCls} value={form.note} onChange={(e) => set('note', e.target.value)} /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn-light py-2 text-sm">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary py-2 text-sm">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-800">{accessTypeLabel(va.accessType) || 'No access recorded'}</h4>
              <div className="flex items-center gap-2">
                {va.status ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLOR[va.status] || 'bg-slate-100 text-slate-600'}`}>{va.status}</span> : null}
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">Age: {accessAge(va.placementDate, va.ageText)}</span>
              </div>
            </div>
            {hasRecord ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                <View title="Access Type" value={accessTypeLabel(va.accessType)} />
                <View title="Location" value={va.location} />
                <View title="Status" value={va.status} />
                <View title="Placement" value={va.placementDate ? toDateInput(va.placementDate) : ''} />
                <View title="Last Maintenance" value={va.lastAssessmentDate ? toDateInput(va.lastAssessmentDate) : ''} />
                <View title="Complications" value={va.complications} />
                {va.note ? <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-slate-400">Note</dt><dd className="text-slate-700">{va.note}</dd></div> : null}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Not recorded.</p>
            )}
          </div>

          {(va.fistula || va.catheter) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <LegacyLine title="Fistula" line={va.fistula} />
              <LegacyLine title="Catheter" line={va.catheter} />
            </div>
          )}

          {va.updatedByName && (
            <p className="mt-3 text-xs text-slate-400">Last updated by {va.updatedByName}</p>
          )}
        </>
      )}
    </div>
  );
}
