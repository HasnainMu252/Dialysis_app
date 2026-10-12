import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { cqiApi, CQI_ROLES } from '../../api/cqiApi';
import { ROLE_LABELS } from '../../constants';
import { personName } from '../../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

/*
 * Monthly CQI review across all patients (admin / DON). Filter by month, year
 * and author role; export the filtered set to CSV.
 */
export default function CqiReviewPanel() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [role, setRole] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    cqiApi.reviewAll({ month, year, role: role || undefined })
      .then((r) => setRows(r.data?.data || []))
      .catch((e) => { toast.error(e?.response?.data?.message || 'Failed to load CQI'); setRows([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, role]);

  const byRole = useMemo(() => {
    const m = {};
    rows.forEach((r) => { m[r.authorRole] = (m[r.authorRole] || 0) + 1; });
    return m;
  }, [rows]);

  const exportCsv = () => {
    const head = ['Date', 'Patient', 'MRN', 'Role', 'Author', 'Phase', 'Comment'];
    const body = rows.map((r) => [
      new Date(r.createdAt).toISOString().slice(0, 10),
      personName(r.patient) || '',
      r.patient?.mrn || r.patientMrn || '',
      ROLE_LABELS[r.authorRole] || r.authorRole || '',
      r.authorName || '',
      r.phase || '',
      String(r.comment || '').replace(/"/g, '""'),
    ]);
    const csv = [head, ...body].map((line) => line.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cqi-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = [year + 1, year, year - 1, year - 2].filter((y, i, a) => a.indexOf(y) === i).sort((a, b) => b - a);
  const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {CQI_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
        <span className="ml-auto text-sm font-semibold text-slate-500">{rows.length} comment{rows.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={exportCsv} disabled={!rows.length} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">Export CSV</button>
      </div>

      {Object.keys(byRole).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byRole).map(([r, n]) => (
            <span key={r} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{ROLE_LABELS[r] || r}: {n}</span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No CQI comments for this period.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()} <span className="block text-xs text-slate-400">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td className="px-4 py-3"><span className="font-semibold text-slate-800">{personName(r.patient) || '—'}</span><span className="ml-1 text-xs text-slate-400">{r.patient?.mrn || r.patientMrn || ''}</span></td>
                  <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{ROLE_LABELS[r.authorRole] || r.authorRole}</span></td>
                  <td className="px-4 py-3 capitalize text-slate-500">{r.phase || 'general'}{r.session ? <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">session</span> : null}</td>
                  <td className="px-4 py-3 text-slate-700">{r.comment}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
