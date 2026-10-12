import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { Activity, Stethoscope, Pill } from 'lucide-react';
import { billingApi } from '../../api/billingApi';
import { patientApi } from '../../api/patientApi';
import { personName } from '../../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';

export default function BillingActivity() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState('activity');

  const [summary, setSummary] = useState({ rows: [], totals: { sessions: 0, rounds: 0, meds: 0 } });
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(false);

  // reconciliation
  const [patients, setPatients] = useState([]);
  const [reconPatient, setReconPatient] = useState('');
  const [recon, setRecon] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      billingApi.activity({ month, year }),
      billingApi.daily({ month, year }),
    ])
      .then(([a, d]) => { setSummary(a.data?.data || { rows: [], totals: {} }); setDaily(d.data?.data?.rows || []); })
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    patientApi.list({ page: 1, limit: 100 }).then((r) => setPatients(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reconPatient) { setRecon(null); return; }
    billingApi.medReconciliation({ patient: reconPatient, month, year })
      .then((r) => setRecon(r.data?.data))
      .catch((e) => { toast.error(e?.response?.data?.message || 'Failed to load reconciliation'); setRecon(null); });
  }, [reconPatient, month, year]);

  const years = [year + 1, year, year - 1, year - 2].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a);

  const exportActivity = () => {
    const head = ['Patient', 'MRN', 'Dialysis sessions', 'MD rounds', 'Drugs given'];
    const body = summary.rows.map((r) => [personName(r.patientInfo), r.patientInfo?.mrn || '', r.sessions, r.rounds, r.meds]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `billing-activity-${year}-${String(month).padStart(2, '0')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const Tab = ({ id, label }) => (
    <button type="button" onClick={() => setView(id)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-blue-50'}`}>{label}</button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Activity" subtitle="Service records — sessions, MD rounds and drugs given. No fees; counts and logs only." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <div className="ml-auto flex gap-2"><Tab id="activity" label="Per-patient" /><Tab id="daily" label="Daily services" /><Tab id="recon" label="Med reconciliation" /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Dialysis sessions" value={summary.totals?.sessions ?? 0} icon={Activity} />
        <StatCard title="MD rounds" value={summary.totals?.rounds ?? 0} icon={Stethoscope} />
        <StatCard title="Drugs given" value={summary.totals?.meds ?? 0} icon={Pill} />
      </div>

      {view === 'activity' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button type="button" onClick={exportActivity} disabled={!summary.rows.length} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Export CSV</button></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Dialysis sessions</th><th className="px-4 py-3">MD rounds</th><th className="px-4 py-3">Drugs given</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
                  : summary.rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No activity for this period.</td></tr>
                    : summary.rows.map((r) => (
                      <tr key={r.patient} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3"><span className="font-semibold text-slate-800">{personName(r.patientInfo)}</span> <span className="ml-1 text-xs text-slate-400">{r.patientInfo?.mrn}</span></td>
                        <td className="px-4 py-3">{r.sessions}</td><td className="px-4 py-3">{r.rounds}</td><td className="px-4 py-3">{r.meds}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'daily' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Dialysis services</th><th className="px-4 py-3">MD services</th><th className="px-4 py-3">Drugs given</th></tr></thead>
            <tbody>
              {daily.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No service days for this period.</td></tr>
                : daily.map((d) => <tr key={d.date} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 text-slate-600">{d.date}</td><td className="px-4 py-3">{d.dialysis}</td><td className="px-4 py-3">{d.md}</td><td className="px-4 py-3">{d.drugs}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {view === 'recon' && (
        <div className="space-y-4">
          <select className={`${inputCls} w-full max-w-md`} value={reconPatient} onChange={(e) => setReconPatient(e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map((p) => <option key={p._id} value={p._id}>{personName(p)} — {p.mrn}</option>)}
          </select>

          {!recon ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><EmptyState message="Pick a patient to reconcile home meds vs in-unit meds for the month." /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-bold text-slate-900">Home medications ({recon.homeMeds.length})</h3>
                {recon.homeMeds.length === 0 ? <p className="text-sm text-slate-400">None on file.</p> : (
                  <ul className="space-y-1 text-sm">{recon.homeMeds.map((m) => <li key={m._id} className={`rounded-lg px-3 py-2 ${m.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>{m.name} {m.dose}{m.unit ? ` ${m.unit}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}</li>)}</ul>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-bold text-slate-900">In-unit this month ({recon.administrations.length})</h3>
                {recon.administrations.length === 0 ? <p className="text-sm text-slate-400">No administrations recorded.</p> : (
                  <ul className="space-y-1 text-sm">{recon.administrations.map((m) => <li key={m._id} className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">{m.name} {m.dose}{m.unit ? ` ${m.unit}` : ''}{m.route ? ` · ${m.route}` : ''} <span className="text-xs text-slate-400">{m.date ? new Date(m.date).toLocaleDateString() : ''}</span></li>)}</ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
