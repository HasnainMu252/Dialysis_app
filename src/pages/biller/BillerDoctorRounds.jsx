import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { reportApi } from '../../api/reportApi';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import api from '../../api/axios';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function BillerDoctorRounds() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportApi.monthlySoap({ month, year });
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load doctor rounds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/soap/monthly', { params: { month, year, format: 'xlsx' }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `doctor-rounds-${year}-${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const rowsPage = usePagedList(data?.patients || [], search, [(p) => p.patientName, (p) => p.patientMrn]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Doctor Rounds (Monthly)" subtitle="Per-patient SOAP / doctor checkup completion by month, ready for billing review and export." />

      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
          <div><label className="label">Year</label><select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
          <button className="btn-light" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</button>
        </div>
        <button className="btn-primary inline-flex items-center gap-2" onClick={downloadExcel} disabled={downloading}><Download size={16} />{downloading ? 'Preparing...' : 'Export Excel'}</button>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Patients" value={data.patientCount} />
          <StatCard title="Fully Completed" value={data.completedPatients} />
          <StatCard title="Total Checkups" value={data.totalCheckups} />
        </div>
      )}

      <div className="card p-3"><input className="input" placeholder="Search patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {data?.patients?.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">MRN</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Completion</th><th className="px-4 py-3">Rounds (Doctor)</th></tr>
            </thead>
            <tbody className="divide-y">
              {rowsPage.paged.map((p) => (
                <tr key={p.patientMrn} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.patientMrn}</td>
                  <td className="px-4 py-3 font-semibold">{p.patientName}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${p.isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.completedCount}/{p.totalRounds}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.rounds.map((r) => `R${r.roundNumber} (${r.doctorName})`).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={rowsPage.page} pageCount={rowsPage.pageCount} total={rowsPage.total} onPage={rowsPage.setPage} label="patients" />
        </div>
      ) : (
        !loading && <EmptyState message="No doctor rounds recorded for this month" />
      )}
    </div>
  );
}
