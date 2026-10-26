import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';

/*
 * Dietitian measurement tab — bone/mineral metabolism and non-bone analytes.
 * Each analyte captures a value (with its unit) and a free-text comment.
 * Editable by dietitian + admin; read-only for everyone else who sees the tab.
 */

const EDIT_ROLES = ['admin', 'dietitian'];
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#123B5D] focus:ring-2 focus:ring-[#123B5D]/10';

const BONE_FIELDS = [
  { key: 'calcium', label: 'Calcium', unit: 'mg/dL' },
  { key: 'phosphorous', label: 'Phosphorous', unit: 'mg/dL' },
  { key: 'pth', label: 'PTH', unit: 'pg/mL' },
  { key: 'vitaminDAnalog', label: 'Vitamin D analog', unit: 'mcg' },
  { key: 'vitaminD2', label: 'Vitamin D2', unit: 'IU' },
];
const NONBONE_FIELDS = [
  { key: 'albumin', label: 'Albumin', unit: 'g/dL' },
  { key: 'protein', label: 'Protein', unit: 'g/dL' },
];

const blankGroup = (fields) => Object.fromEntries(fields.map((f) => [f.key, { value: '', comment: '' }]));

function toForm(a = {}) {
  const fill = (fields, src = {}) => Object.fromEntries(fields.map((f) => [f.key, { value: src[f.key]?.value || '', comment: src[f.key]?.comment || '' }]));
  return { bone: fill(BONE_FIELDS, a.bone), nonBone: fill(NONBONE_FIELDS, a.nonBone) };
}

function MeasureRow({ group, field, data, editing, onChange }) {
  const v = data[field.key] || { value: '', comment: '' };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-800">{field.label}</span>
        <span className="text-[11px] font-semibold text-slate-400">{field.unit}</span>
      </div>
      {editing ? (
        <>
          <input className={`${inputCls} mt-2`} placeholder={`Value (${field.unit})`} value={v.value} onChange={(e) => onChange(group, field.key, 'value', e.target.value)} />
          <input className={`${inputCls} mt-2`} placeholder="Comment" value={v.comment} onChange={(e) => onChange(group, field.key, 'comment', e.target.value)} />
        </>
      ) : (
        <>
          <p className="mt-1 text-lg font-bold text-slate-900">{v.value || '—'} <span className="text-xs font-normal text-slate-400">{v.value ? field.unit : ''}</span></p>
          {v.comment ? <p className="mt-0.5 text-xs text-slate-500">{v.comment}</p> : null}
        </>
      )}
    </div>
  );
}

export default function DietitianAssessmentCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(patient?.dietitianAssessment));

  const assessment = patient?.dietitianAssessment || {};
  const view = useMemo(() => toForm(assessment), [assessment]);

  const onChange = (group, key, field, value) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: { ...f[group][key], [field]: value } } }));

  const startEdit = () => { setForm(toForm(patient?.dietitianAssessment)); setEditing(true); };

  const save = async () => {
    if (!patient?._id) return;
    setSaving(true);
    try {
      const res = await patientApi.updateDietitianAssessment(patient._id, form);
      toast.success('Dietitian assessment saved');
      setEditing(false);
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const data = editing ? form : view;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dietitian Assessment</h2>
          <p className="text-xs text-slate-500">Bone / mineral metabolism and non-bone analytes with the dietitian's comments.</p>
        </div>
        {canEdit && !editing && <button type="button" onClick={startEdit} className="btn-primary py-1.5 text-xs">Edit measurements</button>}
      </div>

      <section>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[#087E8B]">Bone (bone metabolism)</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BONE_FIELDS.map((f) => <MeasureRow key={f.key} group="bone" field={f} data={data.bone} editing={editing} onChange={onChange} />)}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[#087E8B]">Non-Bone</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NONBONE_FIELDS.map((f) => <MeasureRow key={f.key} group="nonBone" field={f} data={data.nonBone} editing={editing} onChange={onChange} />)}
        </div>
      </section>

      {editing && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn-light py-2 text-sm">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary py-2 text-sm">{saving ? 'Saving…' : 'Save assessment'}</button>
        </div>
      )}

      {assessment.updatedByName && !editing && (
        <p className="text-xs text-slate-400">Last updated by {assessment.updatedByName}{assessment.updatedAt ? ` · ${new Date(assessment.updatedAt).toLocaleDateString()}` : ''}</p>
      )}
    </div>
  );
}
