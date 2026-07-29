import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Stethoscope } from 'lucide-react';
import { dialysisPrescriptionApi, RX_OPTIONS } from '../../api/dialysisPrescriptionApi';

const BLANK = {
  frequency: 'Once', duration: '3 Hours', bathOrderType: 'Bath',
  bath: '', bathOther: '', bicarb: '35 mEq', bicarbOther: '',
  sodium: '138 mEq', sodiumOther: '', sodiumVariation: 'None', sodiumModeling: 'No',
  dialyzer: 'F160', dialyzerOther: '', temperature: '37',
  bloodFlowRate: '450', bloodFlowRateOther: '', dialysateFlowRate: '600', dialysateFlowRateOther: '',
  fluidRemoval: '', fluidRemovalOther: '', tubing: '', tubingOther: '',
  needleSize: '15 gauge', accessSite: '', accessSiteOther: '',
  minimumSystolic: '', abnormalPotassium: 'No', abnormalSodium: 'No', comments: '',
};

/** Chip-style single-select matching the order form look. */
function ChipGroup({ label, required, name, value, options, onChange }) {
  return (
    <div className="grid gap-2 py-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        {required && <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">!</span>}
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(name, opt)}
              className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border-sky-700 bg-gradient-to-b from-sky-500 to-sky-700 text-white'
                  : 'border-slate-300 bg-gradient-to-b from-white to-slate-100 text-slate-700 hover:border-slate-400'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Doctor-only hemodialysis order form. Saving creates a new active prescription
 * and supersedes the previous one (history kept server-side).
 */
export default function DialysisPrescriptionForm({ patientId, onSaved }) {
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    dialysisPrescriptionApi.getActive(patientId)
      .then((r) => {
        const rx = r.data?.data;
        if (rx) {
          setHasExisting(true);
          setForm((f) => ({ ...f, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, rx[k] ?? f[k]])) }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setOther = (name) => (e) => set(name, e.target.value);

  const save = async () => {
    if (!form.bath) { toast.error('Bath is required'); return; }
    if (!form.accessSite) { toast.error('Access site is required'); return; }
    setSaving(true);
    try {
      await dialysisPrescriptionApi.save(patientId, {
        ...form,
        minimumSystolic: form.minimumSystolic === '' ? undefined : Number(form.minimumSystolic),
      });
      toast.success('Dialysis prescription saved');
      setHasExisting(true);
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save prescription');
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading prescription...</p>;

  const otherField = (name, placeholder) =>
    form[name] === 'Other' && (
      <div className="grid gap-2 py-1 sm:grid-cols-[190px_minmax(0,1fr)]">
        <span />
        <input className="input w-full sm:max-w-md" placeholder={placeholder} value={form[`${name}Other`]} onChange={setOther(`${name}Other`)} />
      </div>
    );

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center gap-2">
        <Stethoscope size={18} className="text-sky-700" />
        <h3 className="font-extrabold text-slate-900">Hemodialysis Order</h3>
        {hasExisting && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Active order on file</span>}
      </div>
      <p className="mb-3 text-sm text-slate-500">Saving replaces the current active order; the previous one is kept in history.</p>

      <ChipGroup label="Frequency" name="frequency" value={form.frequency} options={RX_OPTIONS.frequency} onChange={set} />
      <ChipGroup label="Duration of Dialysis" name="duration" value={form.duration} options={RX_OPTIONS.duration} onChange={set} />
      <ChipGroup label="Dialysate/Bath Orders" name="bathOrderType" value={form.bathOrderType} options={RX_OPTIONS.bathOrderType} onChange={set} />
      <ChipGroup label="Bath" required name="bath" value={form.bath} options={RX_OPTIONS.bath} onChange={set} />
      {otherField('bath', 'Specify bath')}
      <ChipGroup label="Bicarb (mEq)" name="bicarb" value={form.bicarb} options={RX_OPTIONS.bicarb} onChange={set} />
      {otherField('bicarb', 'Specify bicarb')}
      <ChipGroup label="Na+ (mEq)" name="sodium" value={form.sodium} options={RX_OPTIONS.sodium} onChange={set} />
      {otherField('sodium', 'Specify Na+')}
      <ChipGroup label="Na+ Variation" name="sodiumVariation" value={form.sodiumVariation} options={RX_OPTIONS.sodiumVariation} onChange={set} />

      <div className="grid gap-2 py-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
        <span className="text-sm font-semibold text-slate-700">Na+ Modeling</span>
        <input className="input w-full sm:max-w-md" value={form.sodiumModeling} onChange={setOther('sodiumModeling')} />
      </div>

      <ChipGroup label="Dialyzer" name="dialyzer" value={form.dialyzer} options={RX_OPTIONS.dialyzer} onChange={set} />
      {otherField('dialyzer', 'Specify dialyzer')}
      <ChipGroup label="Dialysate Temp (C)" name="temperature" value={form.temperature} options={RX_OPTIONS.temperature} onChange={set} />
      <ChipGroup label="Blood Flow Rate (mL/min)" name="bloodFlowRate" value={form.bloodFlowRate} options={RX_OPTIONS.bloodFlowRate} onChange={set} />
      {otherField('bloodFlowRate', 'Specify blood flow rate')}
      <ChipGroup label="Dialysate Flow Rate (mL/min)" name="dialysateFlowRate" value={form.dialysateFlowRate} options={RX_OPTIONS.dialysateFlowRate} onChange={set} />
      {otherField('dialysateFlowRate', 'Specify dialysate flow rate')}
      <ChipGroup label="Dry Weight / Fluid Removal" name="fluidRemoval" value={form.fluidRemoval} options={RX_OPTIONS.fluidRemoval} onChange={set} />
      {otherField('fluidRemoval', 'Specify fluid removal')}
      <ChipGroup label="Tubing (mm)" required name="tubing" value={form.tubing} options={RX_OPTIONS.tubing} onChange={set} />
      {otherField('tubing', 'Specify tubing')}
      <ChipGroup label="Needle Size" name="needleSize" value={form.needleSize} options={RX_OPTIONS.needleSize} onChange={set} />
      <ChipGroup label="Access Site" required name="accessSite" value={form.accessSite} options={RX_OPTIONS.accessSite} onChange={set} />
      {otherField('accessSite', 'Specify access site')}

      <div className="grid gap-2 py-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">!</span>
          Keep systolic above
        </div>
        <input className="input w-full sm:max-w-[210px]" type="number" min="0" placeholder="e.g. 90 (mmHg)" value={form.minimumSystolic} onChange={setOther('minimumSystolic')} />
      </div>

      <ChipGroup label="Abnormal Serum K+" name="abnormalPotassium" value={form.abnormalPotassium} options={RX_OPTIONS.yesNo} onChange={set} />
      <ChipGroup label="Abnormal Serum Na+" name="abnormalSodium" value={form.abnormalSodium} options={RX_OPTIONS.yesNo} onChange={set} />

      <div className="grid gap-2 py-2 sm:grid-cols-[190px_minmax(0,1fr)]">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">!</span>
          Comments
        </div>
        <textarea className="input min-h-24 w-full resize-y" value={form.comments} onChange={setOther('comments')} placeholder="Order comments / special instructions" />
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Prescription'}</button>
      </div>
    </div>
  );
}
