import { useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { toDateInput } from '../../utils/accessAge';

// MD, Nurse, Social worker, Front desk (and admin) maintain medical records.
const EDIT_ROLES = ['admin', 'social_worker', 'nurse', 'doctor', 'front_desk'];
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const BLANK_HOSP = { date: '', reason: '', note: '' };

function View({ title, value }) {
  return <div><p className={label}>{title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value || '—'}</p></div>;
}
function Group({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export default function MedicalBackgroundCard({ patient, role, onSaved }) {
  const canEdit = EDIT_ROLES.includes(role);
  const mb = patient?.medicalBackground || {};
  const vac = mb.vaccinations || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const start = () => {
    setForm({
      historyPhysical: mb.historyPhysical || '',
      historyPhysicalUpdatedAt: toDateInput(mb.historyPhysicalUpdatedAt),
      vaccinations: { hepatitis: vac.hepatitis || '', tb: vac.tb || '', isolations: vac.isolations || '', other: vac.other || '' },
      hospitalizations: (mb.hospitalizations || []).map((h) => ({ date: toDateInput(h.date), reason: h.reason || '', note: h.note || '' })),
      cardiacWorkup: mb.cardiacWorkup || '',
      cancerWorkup: mb.cancerWorkup || '',
      other: mb.other || '',
      transplant: mb.transplant || '',
      transplantCorrespondence: mb.transplantCorrespondence || '',
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        historyPhysicalUpdatedAt: form.historyPhysicalUpdatedAt || undefined,
        hospitalizations: form.hospitalizations.map((h) => ({ ...h, date: h.date || undefined })),
      };
      const res = await patientApi.updateMedicalBackground(patient._id, payload);
      toast.success('Medical records saved');
      setEditing(false);
      onSaved?.(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const setVac = (k, v) => setForm((f) => ({ ...f, vaccinations: { ...f.vaccinations, [k]: v } }));
  const setHosp = (i, k, v) => setForm((f) => ({ ...f, hospitalizations: f.hospitalizations.map((h, idx) => (idx === i ? { ...h, [k]: v } : h)) }));

  // H&P due flag: older than 6 months
  const hpDate = mb.historyPhysicalUpdatedAt ? new Date(mb.historyPhysicalUpdatedAt) : null;
  const hpDue = hpDate ? (Date.now() - hpDate.getTime()) > 1000 * 60 * 60 * 24 * 183 : true;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Patient Medical Records</h2>
        {canEdit && !editing && <button type="button" onClick={start} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Edit</button>}
      </div>

      {editing ? (
        <div className="space-y-4">
          <Group title="Internal">
            <div className="grid gap-3">
              <label className="block"><span className={label}>History &amp; Physical (updated every 6 months)</span><textarea className={`${inputCls} mt-1 min-h-20`} value={form.historyPhysical} onChange={(e) => setForm({ ...form, historyPhysical: e.target.value })} /></label>
              <label className="block max-w-xs"><span className={label}>H&amp;P last updated</span><input type="date" className={`${inputCls} mt-1`} value={form.historyPhysicalUpdatedAt} onChange={(e) => setForm({ ...form, historyPhysicalUpdatedAt: e.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className={label}>Hepatitis status</span><input className={`${inputCls} mt-1`} value={form.vaccinations.hepatitis} onChange={(e) => setVac('hepatitis', e.target.value)} /></label>
                <label className="block"><span className={label}>TB status</span><input className={`${inputCls} mt-1`} value={form.vaccinations.tb} onChange={(e) => setVac('tb', e.target.value)} /></label>
                <label className="block"><span className={label}>Isolations</span><input className={`${inputCls} mt-1`} value={form.vaccinations.isolations} onChange={(e) => setVac('isolations', e.target.value)} /></label>
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Individual vaccine doses (name, type, route, date &amp; time) are now recorded on the dedicated <b>Vaccination</b> tab.</p>
            </div>
          </Group>

          <Group title="External">
            <div className="mb-2 flex items-center justify-between">
              <p className={label}>Hospitalizations</p>
              <button type="button" onClick={() => setForm({ ...form, hospitalizations: [...form.hospitalizations, { ...BLANK_HOSP }] })} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">+ Add</button>
            </div>
            <div className="space-y-2">
              {form.hospitalizations.map((h, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[150px_1fr_1fr_auto]">
                  <input type="date" className={inputCls} value={h.date} onChange={(e) => setHosp(i, 'date', e.target.value)} />
                  <input className={inputCls} placeholder="Reason" value={h.reason} onChange={(e) => setHosp(i, 'reason', e.target.value)} />
                  <input className={inputCls} placeholder="Note" value={h.note} onChange={(e) => setHosp(i, 'note', e.target.value)} />
                  <button type="button" onClick={() => setForm({ ...form, hospitalizations: form.hospitalizations.filter((_, idx) => idx !== i) })} className="text-xs font-bold text-red-600">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block"><span className={label}>Cardiac workup</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.cardiacWorkup} onChange={(e) => setForm({ ...form, cardiacWorkup: e.target.value })} /></label>
              <label className="block"><span className={label}>Cancer workup</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.cancerWorkup} onChange={(e) => setForm({ ...form, cancerWorkup: e.target.value })} /></label>
            </div>
            <label className="mt-3 block"><span className={label}>Other pertinent information</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} /></label>
          </Group>

          <Group title="Kidney Transplant">
            <div className="grid gap-3">
              <label className="block"><span className={label}>Transplant information</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.transplant} onChange={(e) => setForm({ ...form, transplant: e.target.value })} /></label>
              <label className="block"><span className={label}>Correspondence from transplant center</span><textarea className={`${inputCls} mt-1 min-h-16`} value={form.transplantCorrespondence} onChange={(e) => setForm({ ...form, transplantCorrespondence: e.target.value })} /></label>
            </div>
          </Group>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Group title="Internal">
            <div className="space-y-4">
              <div>
                <p className={label}>History &amp; Physical {mb.historyPhysicalUpdatedAt ? <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${hpDue ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{hpDue ? 'Due (>6 mo)' : 'Up to date'} · {toDateInput(mb.historyPhysicalUpdatedAt)}</span> : <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Not recorded</span>}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{mb.historyPhysical || '—'}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <View title="Hepatitis status" value={vac.hepatitis} />
                <View title="TB status" value={vac.tb} />
                <View title="Isolations" value={vac.isolations} />
              </div>
            </div>
          </Group>

          <Group title="External">
            <div>
              <p className={label}>Hospitalizations</p>
              {(mb.hospitalizations || []).length === 0 ? <p className="mt-1 text-sm text-slate-400">None recorded.</p> : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {mb.hospitalizations.map((h, i) => (
                    <li key={h._id || i} className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">{h.date ? new Date(h.date).toLocaleDateString() : '—'}</span> · {h.reason || '—'}{h.note ? ` — ${h.note}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <View title="Cardiac workup" value={mb.cardiacWorkup} />
              <View title="Cancer workup" value={mb.cancerWorkup} />
            </div>
            <div className="mt-3"><View title="Other pertinent information" value={mb.other} /></div>
          </Group>

          <Group title="Kidney Transplant">
            <div className="grid gap-4 sm:grid-cols-2">
              <View title="Transplant information" value={mb.transplant} />
              <View title="Correspondence from transplant center" value={mb.transplantCorrespondence} />
            </div>
          </Group>

          {mb.updatedByName && <p className="text-xs text-slate-400">Last updated by {mb.updatedByName}</p>}
        </div>
      )}
    </div>
  );
}
