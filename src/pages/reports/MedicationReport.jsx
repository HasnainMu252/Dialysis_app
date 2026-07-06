import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { medicationApi } from '../../api/medicationApi';
import api from '../../api/axios';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MedicationReport() {
  const [data, setData] = useState({ columns: [], rows: [] });
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await medicationApi.report({ month, year });
      setData(res.data?.data || { columns: [], rows: [] });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load medication report');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  const download = async (fmt) => {
    setDownloading(true);
    try {
      const res = await api.get('/medications/report', { params: { month, year, format: fmt }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `medication-report-${year}-${String(month).padStart(2, '0')}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Export failed');
    } finally { setDownloading(false); }
  };

  const { paged, page, setPage, total, pageCount } = usePagedList(data.rows || [], search, [(r) => r.patientName, (r) => r.mrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="Medication Administration Report" subtitle="Auto-generated from recorded dialysis sessions — no manual writing." />

      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
          <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
          <div><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => download('xlsx')} disabled={downloading}><Download size={16} /> Excel</button>
          <button className="btn-light inline-flex items-center gap-2" onClick={() => download('csv')} disabled={downloading}><Download size={16} /> CSV</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Patient</th><th className="px-3 py-3">MRN</th><th className="px-3 py-3">Facility</th><th className="px-3 py-3">Insurance</th><th className="px-3 py-3">HD</th>
              {(data.columns || []).map((c) => <th key={c} className="px-3 py-3 text-center">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((r) => (
              <tr key={r.mrn} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3 font-semibold">{r.patientName}</td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{r.mrn}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.facility || '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.insurance || '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-center font-bold">{r.hdQty}</td>
                {(data.columns || []).map((c) => <td key={c} className="px-3 py-3 text-center">{r.meds?.[c] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!(data.rows || []).length && !loading && <EmptyState message="No medication data for this month" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="patients" /></div>
      </div>
    </div>
  );
}
