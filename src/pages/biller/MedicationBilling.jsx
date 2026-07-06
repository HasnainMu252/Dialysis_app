import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { medicationApi } from '../../api/medicationApi';
import { dateOnly } from '../../utils/format';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MedicationBilling() {
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(null); // grouped patient being viewed

  const load = async () => {
    setLoading(true);
    try {
      const res = await medicationApi.billing({ month, year });
      setRows(res.data?.data?.rows || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load medication billing');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  // group per patient — one row each, no repetition
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.mrn || r.patientName;
      if (!map.has(key)) map.set(key, { patientName: r.patientName, mrn: r.mrn, items: [], distinct: new Set() });
      const g = map.get(key);
      g.items.push(r);
      g.distinct.add(r.medication);
    });
    return Array.from(map.values()).map((g) => ({ ...g, entries: g.items.length, distinctCount: g.distinct.size }));
  }, [rows]);

  const { paged, page, setPage, total, pageCount } = usePagedList(grouped, search, [(g) => g.patientName, (g) => g.mrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="Medication Billing" subtitle="One row per patient. Click View to see every medication administered." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div className="md:col-span-2"><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">MRN</th><th className="px-4 py-3">Administrations</th><th className="px-4 py-3">Distinct Meds</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((g) => (
              <tr key={g.mrn} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{g.patientName}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{g.mrn}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className="rounded-lg bg-blue-50 px-2 py-1 font-bold text-blue-700">{g.entries}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{g.distinctCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right"><button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100" onClick={() => setView(g)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!grouped.length && !loading && <EmptyState message="No medications recorded for this period" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="patients" /></div>
      </div>

      {view && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setView(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div><h3 className="text-lg font-extrabold text-slate-900">{view.patientName}</h3><p className="text-xs text-slate-500">{view.mrn} · {view.entries} administrations</p></div>
              <button onClick={() => setView(null)}><X className="text-slate-400" /></button>
            </div>
            <div className="space-y-4 p-4">
              {(() => {
                const groups = {};
                view.items.forEach((r) => {
                  const key = r.administrationDate ? new Date(r.administrationDate).toISOString().slice(0, 10) : 'unknown';
                  (groups[key] = groups[key] || []).push(r);
                });
                const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
                return dates.map((d) => {
                  const items = groups[d].sort((a, b) => new Date(a.administrationDate) - new Date(b.administrationDate));
                  const header = d === 'unknown' ? 'Undated' : new Date(d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  return (
                    <div key={d} className="rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between rounded-t-2xl bg-slate-900 px-4 py-2.5 text-white">
                        <b className="text-sm">{header}</b>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{items.length} med(s)</span>
                      </div>
                      <div className="divide-y">
                        {items.map((r) => {
                          const time = r.administrationDate ? new Date(r.administrationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                          return (
                            <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                              <b className="w-14 shrink-0 font-mono text-blue-700">{time}</b>
                              <span className="min-w-[120px] flex-1 font-semibold text-slate-800">{r.medication}</span>
                              <span className="text-slate-600">{r.dose} {r.unit}</span>
                              <span className="text-slate-400">×{r.quantity}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{r.route}</span>
                              <span className="text-xs text-slate-500">{r.nurse}</span>
                              <StatusBadge status={r.billingStatus} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
