import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { reportApi } from '../../api/reportApi';
import { dateOnly } from '../../utils/format';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function DialysisBilling() {
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportApi.dialysisBilling({ month, year });
      setRows(res.data?.data?.rows || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load dialysis billing');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  const { paged, page, setPage, total, pageCount } = usePagedList(rows, search, [(r) => r.patientName, (r) => r.patientMrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="Dialysis Billing" subtitle="Completed dialysis sessions prepared for submission to CDMS (Azura Dialysis)." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div className="md:col-span-2"><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Chair</th><th className="px-4 py-3">Treatment Date</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Treatment Count</th><th className="px-4 py-3">Billing Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((r) => (
              <tr key={r.sessionId} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.patientName}<div className="text-xs font-normal text-slate-500">{r.patientMrn}</div></td>
                <td className="whitespace-nowrap px-4 py-3">{r.chair}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.treatmentDate ? dateOnly(r.treatmentDate) : '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.durationMinutes != null ? `${r.durationMinutes} min` : '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.treatmentCount}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={r.billingStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !loading && <EmptyState message="No completed dialysis sessions for this period" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="sessions" /></div>
      </div>
    </div>
  );
}
