import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Syringe, Trash2 } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import NoteAuthor from './NoteAuthor';

const EDIT_ROLES = ['admin', 'doctor', 'nurse', 'technician'];
const ROUTES = ['Injection', 'Oral'];

const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#123B5D] focus:ring-2 focus:ring-[#123B5D]/10';

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm for <input type="datetime-local">
};

const emptyForm = () => ({ vaccineName: '', vaccineType: '', route: 'Injection', givenAt: nowLocal(), comments: '' });

/*
 * Structured vaccination log for one patient — its own tab. Each dose records the
 * vaccine name, type, route (Injection / Oral), date & time, and comments. Clinical
 * staff add entries; authors (or admin) can remove their own.
 */
export default function VaccinationCard({ patient, role, currentUserId, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const list = useMemo(
    () => [...(patient?.vaccinations || [])].sort((a, b) => new Date(b.givenAt || b.createdAt) - new Date(a.givenAt || a.createdAt)),
    [patient?.vaccinations]
  );

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.vaccineName.trim()) { toast.error('Enter a vaccine name'); return; }
    setSaving(true);
    try {
      const res = await patientApi.addVaccination(patient._id, {
        vaccineName: form.vaccineName.trim(),
        vaccineType: form.vaccineType.trim(),
        route: form.route,
        givenAt: form.givenAt ? new Date(form.givenAt).toISOString() : undefined,
        comments: form.comments.trim(),
      });
      toast.success('Vaccination recorded');
      setAdding(false);
      setForm(emptyForm());
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (entry) => {
    if (!window.confirm(`Delete the ${entry.vaccineName} record?`)) return;
    try {
      const res = await patientApi.deleteVaccination(patient._id, entry._id);
      toast.success('Deleted');
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Syringe size={18} className="text-[#087E8B]" />
          <h2 className="text-lg font-bold text-slate-900">Vaccinations</h2>
        </div>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn-primary py-1.5 text-xs">Record vaccine</button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className={label}>Vaccine Name *</span><input className={inputCls} placeholder="e.g. Hepatitis B" value={form.vaccineName} onChange={(e) => set('vaccineName', e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className={label}>Type</span><input className={inputCls} placeholder="e.g. Recombinant, mRNA" value={form.vaccineType} onChange={(e) => set('vaccineType', e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className={label}>Route</span>
              <select className={inputCls} value={form.route} onChange={(e) => set('route', e.target.value)}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className={label}>Date &amp; Time</span><input type="datetime-local" className={inputCls} value={form.givenAt} onChange={(e) => set('givenAt', e.target.value)} /></label>
          </div>
          <label className="flex flex-col gap-1"><span className={label}>Comments</span><textarea className={`${inputCls} min-h-16`} placeholder="Site, lot number, reaction, etc." value={form.comments} onChange={(e) => set('comments', e.target.value)} /></label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(emptyForm()); }} disabled={saving} className="btn-light py-2 text-sm">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary py-2 text-sm">{saving ? 'Saving…' : 'Save vaccine'}</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Vaccine</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Date &amp; Time</th>
              <th className="px-4 py-3">Comments</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No vaccinations recorded yet.</td></tr>
            ) : (
              list.map((v) => {
                const mine = String(v.author) === String(currentUserId);
                const canDelete = mine || role === 'admin';
                return (
                  <tr key={v._id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-800">{v.vaccineName}</td>
                    <td className="px-4 py-3 text-slate-600">{v.vaccineType || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${v.route === 'Oral' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#087E8B]/10 text-[#087E8B]'}`}>{v.route || 'Injection'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {v.givenAt ? new Date(v.givenAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      <NoteAuthor name={v.authorName} role={v.authorRole} at={v.createdAt} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.comments || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && canDelete && (
                        <button type="button" title="Delete" onClick={() => remove(v)} className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
