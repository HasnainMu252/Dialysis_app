import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, BellRing, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import EvaluationForm from '../../components/doctor/EvaluationForm';
import { patientApi } from '../../api/patientApi';
import { evaluationApi } from '../../api/evaluationApi';
import { defaultFields } from '../../constants/evaluationForm';
import { SHIFTS, shiftLabel } from '../../constants';
import { personName } from '../../utils/format';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/*
 * Shift-wise physician evaluation runner. Pick a shift → its patients are
 * auto-selected → fill the form once → submit for the whole shift. Enforces the
 * cadence: 4 monthly rounds per patient per month (no repeat of the same round),
 * 1 weekly per patient per week. Shows a progress/alert panel for what's pending.
 */
export default function EvaluationRunner({ kind }) {
  const title = kind === 'weekly' ? 'Weekly Evaluation' : 'Physician Monthly Round';
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState(1);
  const [roundNumber, setRoundNumber] = useState(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [deselected, setDeselected] = useState({});
  const [fields, setFields] = useState(() => defaultFields(kind));
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null); // { rows, summary }
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    setLoading(true);
    patientApi.list({ limit: 1000 })
      .then((r) => setPatients((r.data?.data || []).filter((p) => (p.status || 'active') === 'active')))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setFields(defaultFields(kind)); }, [kind]);

  // Load completion progress for the current period.
  const loadProgress = () => {
    const call = kind === 'monthly'
      ? evaluationApi.monthlyProgress({ month, year })
      : evaluationApi.weeklyProgress({});
    call.then((r) => setProgress(r.data?.data || null)).catch(() => setProgress(null));
  };
  useEffect(() => { loadProgress(); /* eslint-disable-next-line */ }, [kind, month, year]);

  // Map patientId → progress row, to flag who already has this round / weekly.
  const progressById = useMemo(() => {
    const map = {};
    (progress?.rows || []).forEach((r) => { map[r._id] = r; });
    return map;
  }, [progress]);

  const alreadyDone = (pid) => {
    const row = progressById[pid];
    if (!row) return false;
    return kind === 'weekly' ? !!row.done : (row.done || []).includes(Number(roundNumber));
  };

  const shiftPatients = useMemo(
    () => patients.filter((p) => Number(p.shift) === Number(shift)),
    [patients, shift]
  );
  useEffect(() => { setDeselected({}); }, [shift, roundNumber]);

  // Selected = in shift, not manually unticked, and not already done this period.
  const selectedIds = useMemo(
    () => shiftPatients.filter((p) => !deselected[p._id] && !alreadyDone(p._id)).map((p) => p._id),
    // eslint-disable-next-line
    [shiftPatients, deselected, progressById, roundNumber, kind]
  );

  const submit = async () => {
    if (!selectedIds.length) return toast.error('No patients to save (all selected are already done)');
    setSaving(true);
    try {
      const res = await evaluationApi.batch({ patientIds: selectedIds, kind, shift: Number(shift), roundNumber: kind === 'monthly' ? Number(roundNumber) : null, month: Number(month), year: Number(year), fields });
      const d = res.data?.data || {};
      toast.success(res.data?.message || 'Saved');
      if (d.skipped) toast(`Skipped ${d.skipped} already done: ${(d.skippedNames || []).slice(0, 3).join(', ')}${d.skippedNames?.length > 3 ? '…' : ''}`, { icon: '⚠️' });
      setFields(defaultFields(kind));
      loadProgress();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sendAlert = async () => {
    setNotifying(true);
    try {
      const res = await evaluationApi.notifyPending({ kind, month, year });
      toast.success(res.data?.message || 'Alert sent');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not send alert');
    } finally { setNotifying(false); }
  };

  // Patients still incomplete (for the alert panel).
  const incomplete = useMemo(() => (progress?.rows || []).filter((r) => (kind === 'monthly' ? !r.complete : !r.done)), [progress, kind]);

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={kind === 'monthly'
        ? 'Each patient gets 4 monthly rounds. Pick a shift and round, fill once, submit for the whole shift. Rounds already done are skipped.'
        : 'One weekly evaluation per patient per week. Pick a shift, fill once, submit for the whole shift.'} />

      {/* PROGRESS / ALERT PANEL */}
      {progress && (
        <section className={`card p-4 ${incomplete.length ? 'border-amber-300 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/40'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {incomplete.length ? <AlertTriangle size={20} className="text-amber-600" /> : <CheckCircle2 size={20} className="text-emerald-600" />}
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {kind === 'monthly'
                    ? `${progress.summary.complete}/${progress.summary.total} patients completed all 4 rounds this month`
                    : `${progress.summary.done}/${progress.summary.total} patients have this week's evaluation`}
                </p>
                <p className="text-xs text-slate-500">{incomplete.length ? `${incomplete.length} patient(s) still pending` : 'All caught up.'}</p>
              </div>
            </div>
            {incomplete.length > 0 && (
              <button className="btn-light inline-flex items-center gap-2 py-2 text-sm" onClick={sendAlert} disabled={notifying}>
                <BellRing size={15} /> {notifying ? 'Sending…' : 'Send pending alert'}
              </button>
            )}
          </div>
          {incomplete.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-amber-200 bg-white/70">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500"><tr><th className="px-3 py-1.5">Patient</th><th className="px-3 py-1.5">Shift</th><th className="px-3 py-1.5">{kind === 'monthly' ? 'Done / Missing' : 'Status'}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {incomplete.slice(0, 50).map((r) => (
                    <tr key={r._id}>
                      <td className="px-3 py-1.5 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-3 py-1.5 text-slate-500">{shiftLabel(r.shift) || '—'}</td>
                      <td className="px-3 py-1.5">
                        {kind === 'monthly'
                          ? <span className="text-slate-600"><b className="text-emerald-700">{r.done.length}/4</b>{r.missing.length ? ` · missing ${r.missing.map((m) => `R${m}`).join(', ')}` : ''}</span>
                          : <span className="font-semibold text-amber-700">Pending this week</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className={`card grid gap-3 p-4 sm:grid-cols-2 ${kind === 'monthly' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <div>
          <label className="label">Shift</label>
          <select className="input" value={shift} onChange={(e) => setShift(Number(e.target.value))}>
            {SHIFTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {kind === 'monthly' && (
          <div>
            <label className="label">Round</label>
            <select className="input" value={roundNumber} onChange={(e) => setRoundNumber(Number(e.target.value))}>
              {[1, 2, 3, 4].map((r) => <option key={r} value={r}>Round {r}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div className="flex items-end"><span className="rounded-xl bg-[#087E8B]/10 px-3 py-2 text-sm font-bold text-[#087E8B]">{selectedIds.length} to save</span></div>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-base font-extrabold text-slate-900">
          {shiftLabel(shift)} patients{kind === 'monthly' ? ` · Round ${roundNumber}` : ''} — untick anyone to skip
        </h2>
        {loading ? <p className="py-4 text-center text-sm text-slate-400">Loading…</p> : !shiftPatients.length ? (
          <EmptyState message={`No active patients in ${shiftLabel(shift)}`} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {shiftPatients.map((p) => {
              const done = alreadyDone(p._id);
              const on = !deselected[p._id] && !done;
              return (
                <label key={p._id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition ${done ? 'border-emerald-200 bg-emerald-50/60' : on ? 'border-[#123B5D]/40 bg-[#123B5D]/5' : 'border-slate-200 opacity-60'}`}>
                  <input type="checkbox" checked={on} disabled={done} onChange={() => setDeselected((d) => ({ ...d, [p._id]: on }))} className="accent-[#123B5D]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{personName(p)}</p>
                    <p className="truncate text-[11px] text-slate-500">{done ? (kind === 'monthly' ? `Round ${roundNumber} done` : 'Done this week') : p.mrn}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <EvaluationForm kind={kind} value={fields} onChange={setFields} />

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 backdrop-blur">
        <button className="btn-light" onClick={() => setFields(defaultFields(kind))} disabled={saving}>Reset to prefilled</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : `Submit ${kind === 'weekly' ? 'Weekly Evaluation' : `Monthly Round ${roundNumber}`} · ${selectedIds.length} patient(s)`}
        </button>
      </div>
    </div>
  );
}
