import { useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';

const EDIT_ROLES = ['admin', 'dietitian'];
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';

export default function NutritionCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const n = patient?.nutrition || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [newMat, setNewMat] = useState({ title: '', note: '' });

  const start = () => {
    setForm({
      foodHurdles: n.foodHurdles || '',
      notes: n.notes || '',
      educationMaterials: (n.educationMaterials || []).map((e) => ({ ...e })),
    });
    setNewMat({ title: '', note: '' });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const educationMaterials = [...form.educationMaterials];
      if (newMat.title.trim() || newMat.note.trim()) educationMaterials.push({ ...newMat });
      const res = await patientApi.updateNutrition(patient._id, { ...form, educationMaterials });
      toast.success('Nutrition info saved');
      setEditing(false);
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Nutrition</h2>
        {canEdit && !editing && <button type="button" onClick={start} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Edit</button>}
      </div>

      {editing ? (
        <div className="space-y-4">
          <label className="block"><span className={label}>Food hurdles (social issues with food)</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.foodHurdles} onChange={(e) => setForm({ ...form, foodHurdles: e.target.value })} /></label>
          <label className="block"><span className={label}>Notes</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

          <div>
            <p className={label}>Education materials given</p>
            <div className="mt-2 space-y-2">
              {form.educationMaterials.map((e, i) => (
                <div key={e._id || i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                  <span className="flex-1 text-slate-700"><b>{e.title || 'Material'}</b>{e.note ? ` — ${e.note}` : ''}</span>
                  <button type="button" onClick={() => setForm({ ...form, educationMaterials: form.educationMaterials.filter((_, idx) => idx !== i) })} className="text-xs font-bold text-red-600">Remove</button>
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Material title" value={newMat.title} onChange={(e) => setNewMat({ ...newMat, title: e.target.value })} />
                <input className={inputCls} placeholder="Note" value={newMat.note} onChange={(e) => setNewMat({ ...newMat, note: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div><p className={label}>Food hurdles</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.foodHurdles || '—'}</p></div>
          <div><p className={label}>Notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.notes || '—'}</p></div>
          <div>
            <p className={label}>Education materials</p>
            {(n.educationMaterials || []).length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">None recorded.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {n.educationMaterials.map((e, i) => (
                  <li key={e._id || i} className="rounded-lg bg-slate-50 px-3 py-2"><b>{e.title || 'Material'}</b>{e.note ? ` — ${e.note}` : ''}{e.givenAt ? <span className="ml-2 text-xs text-slate-400">{new Date(e.givenAt).toLocaleDateString()}</span> : null}</li>
                ))}
              </ul>
            )}
          </div>
          {n.updatedByName && <p className="text-xs text-slate-400">Last updated by {n.updatedByName}</p>}
        </div>
      )}
    </div>
  );
}
