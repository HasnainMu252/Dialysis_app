import { useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';

const EDIT_ROLES = ['admin', 'social_worker'];
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';

function View({ title, value }) {
  return (
    <div>
      <p className={label}>{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

export default function SocialWorkCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const sw = patient?.socialWork || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [newComplaint, setNewComplaint] = useState('');

  const start = () => {
    setForm({
      evaluation: sw.evaluation || '',
      transportation: sw.transportation || '',
      familyDynamics: sw.familyDynamics || '',
      transplant: sw.transplant || '',
      complaints: (sw.complaints || []).map((c) => ({ ...c })),
    });
    setNewComplaint('');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const complaints = [...form.complaints];
      if (newComplaint.trim()) complaints.push({ text: newComplaint.trim() });
      const res = await patientApi.updateSocialWork(patient._id, { ...form, complaints });
      toast.success('Social work info saved');
      setEditing(false);
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Social Work</h2>
        {canEdit && !editing && <button type="button" onClick={start} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Edit</button>}
      </div>

      {editing ? (
        <div className="space-y-4">
          {[['evaluation', 'Patient evaluation'], ['transportation', 'Transportation'], ['familyDynamics', 'Family dynamics'], ['transplant', 'Transplant information']].map(([k, lbl]) => (
            <label key={k} className="block">
              <span className={label}>{lbl}</span>
              <textarea className={`${inputCls} mt-1 min-h-16`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}

          <div>
            <p className={label}>Complaints (doctor can see these)</p>
            <div className="mt-2 space-y-2">
              {form.complaints.map((c, i) => (
                <div key={c._id || i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                  <span className="flex-1 text-slate-700">{c.text}</span>
                  <button type="button" onClick={() => setForm({ ...form, complaints: form.complaints.filter((_, idx) => idx !== i) })} className="text-xs font-bold text-red-600 hover:text-red-700">Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input className={inputCls} placeholder="Add a complaint…" value={newComplaint} onChange={(e) => setNewComplaint(e.target.value)} />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <View title="Patient evaluation" value={sw.evaluation} />
            <View title="Transportation" value={sw.transportation} />
            <View title="Family dynamics" value={sw.familyDynamics} />
            <View title="Transplant information" value={sw.transplant} />
          </div>
          <div>
            <p className={label}>Complaints</p>
            {(sw.complaints || []).length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No complaints recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {sw.complaints.map((c, i) => (
                  <li key={c._id || i} className="rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-sm text-slate-700">
                    {c.text}
                    <span className="ml-2 text-xs text-slate-400">— {c.createdByName || 'Social worker'}{c.createdAt ? `, ${new Date(c.createdAt).toLocaleDateString()}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {sw.updatedByName && <p className="text-xs text-slate-400">Last updated by {sw.updatedByName}</p>}
        </div>
      )}
    </div>
  );
}
