import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { cqiApi, CQI_ROLES } from '../../api/cqiApi';
import { ROLE_LABELS } from '../../constants';
import { personName } from '../../utils/format';
import { downloadExcel } from '../../utils/exportExcel';

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
  const [q, setQ] = useState('');
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Client-side name search over patient name, MRN and author name.
  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return allRows;
    return allRows.filter((r) =>
      `${personName(r.patient) || ''} ${r.patient?.mrn || r.patientMrn || ''} ${r.authorName || ''}`
        .toLowerCase()
        .includes(kw)
    );
  }, [allRows, q]);

  const load = () => {
    setLoading(true);
    cqiApi.reviewAll({ month, year, role: role || undefined })
      .then((r) => setAllRows(r.data?.data || []))
      .catch((e) => { toast.error(e?.response?.data?.message || 'Failed to load CQI'); setAllRows([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, role]);

  const byRole = useMemo(() => {
    const m = {};
    rows.forEach((r) => { m[r.authorRole] = (m[r.authorRole] || 0) + 1; });
    return m;
  }, [rows]);

  const exportCsv = () => {
    const body = rows.map((r) => ({
      date: new Date(r.createdAt).toISOString().slice(0, 10),
      patient: personName(r.patient) || '',
      mrn: r.patient?.mrn || r.patientMrn || '',
      role: ROLE_LABELS[r.authorRole] || r.authorRole || '',
      author: r.authorName || '',
      phase: r.phase || '',
      comment: String(r.comment || ''),
    }));
    downloadExcel({
      title: `CQI Review — ${MONTHS[month - 1]} ${year}`,
      sheetName: 'CQI',
      filename: `cqi-${year}-${String(month).padStart(2, '0')}`,
      columns: [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Patient', key: 'patient', width: 24 },
        { header: 'MRN', key: 'mrn', width: 12 },
        { header: 'Role', key: 'role', width: 14 },
        { header: 'Author', key: 'author', width: 20 },
        { header: 'Phase', key: 'phase', width: 12 },
        { header: 'Comment', key: 'comment', width: 50 },
      ],
      rows: body,
    });
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
        <input className={`${inputCls} min-w-[200px] flex-1`} placeholder="Search patient or author name…" value={q} onChange={(e) => setQ(e.target.value)} />
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No CQI comments for this period.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()} <span className="block text-xs text-slate-400">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td className="px-4 py-3"><span className="font-semibold text-slate-800">{personName(r.patient) || '—'}</span><span className="ml-1 text-xs text-slate-400">{r.patient?.mrn || r.patientMrn || ''}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{r.authorName || '—'}</td>
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
