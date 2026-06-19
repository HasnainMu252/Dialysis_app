import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { Activity, Armchair, CalendarDays, CreditCard, Download, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { reportApi } from '../../api/reportApi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants';

const toChart = (byStatus = {}) =>
  Object.entries(byStatus).map(([name, value]) => ({ name, value }));

const now = new Date();

export default function DashboardReports() {
  const { user } = useAuth();
  const canSeeSoap = [ROLES.ADMIN, ROLES.DOCTOR].includes(user?.role);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [soap, setSoap] = useState(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await reportApi.overview();
      setOverview(res.data?.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadSoap = async () => {
    if (!canSeeSoap) return;
    setSoapLoading(true);
    try {
      const res = await reportApi.monthlySoap({ month, year });
      setSoap(res.data?.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load SOAP report');
    } finally {
      setSoapLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadSoap(); /* eslint-disable-next-line */ }, [month, year]);

  const downloadSoapExcel = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/soap/monthly', {
        params: { month, year, format: 'xlsx' },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `soap-report-${year}-${String(month).padStart(2, '0')}.xlsx`;
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

  const sessionChart = useMemo(() => toChart(overview?.sessions?.byStatus), [overview]);
  const chairChart = useMemo(() => toChart(overview?.chairs?.byStatus), [overview]);
  const claimChart = useMemo(() => toChart(overview?.billing?.byStatus), [overview]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Operational, session, chair and billing metrics, plus monthly SOAP reporting."
        action={<button className="btn-light" onClick={loadOverview}>{loading ? 'Loading...' : 'Refresh'}</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Active Patients" value={overview?.patients?.active ?? 0} icon={Users} />
        <StatCard title="Chairs" value={overview?.chairs?.total ?? 0} icon={Armchair} />
        <StatCard title="Schedules" value={overview?.schedules?.total ?? 0} icon={CalendarDays} />
        <StatCard title="Sessions" value={overview?.sessions?.total ?? 0} icon={Activity} />
        <StatCard title="Paid Revenue" value={Number(overview?.billing?.paidRevenue || 0).toLocaleString()} icon={CreditCard} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card p-5"><h2 className="mb-4 font-bold">Sessions by Status</h2><ResponsiveContainer width="100%" height={260}><BarChart data={sessionChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" /></BarChart></ResponsiveContainer></section>
        <section className="card p-5"><h2 className="mb-4 font-bold">Chairs by Status</h2><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={chairChart} dataKey="value" nameKey="name" outerRadius={95} label>{chairChart.map((_, i) => <Cell key={i} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></section>
        <section className="card p-5"><h2 className="mb-4 font-bold">Claims by Status</h2><ResponsiveContainer width="100%" height={260}><BarChart data={claimChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" /></BarChart></ResponsiveContainer></section>
      </div>

      {canSeeSoap && (
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Monthly SOAP Report</h2>
              <p className="text-sm text-slate-500">Doctor checkup completion per patient for the selected month (x/{soap?.totalRounds || 4} rounds).</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div><label className="label">Month</label><input className="input" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div>
              <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
              <button className="btn-light" onClick={loadSoap} disabled={soapLoading}>{soapLoading ? 'Loading...' : 'Apply'}</button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={downloadSoapExcel} disabled={downloading}><Download size={16} />{downloading ? 'Preparing...' : 'Export Excel'}</button>
            </div>
          </div>

          {soap && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Patients" value={soap.patientCount} icon={Users} />
              <StatCard title="Fully Completed" value={soap.completedPatients} icon={Activity} />
              <StatCard title="Total Checkups" value={soap.totalCheckups} icon={CalendarDays} />
            </div>
          )}

          {soap?.patients?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr><th className="py-2 pr-3">MRN</th><th className="py-2 pr-3">Patient</th><th className="py-2 pr-3">Completion</th><th className="py-2 pr-3">Rounds (Doctor)</th></tr>
                </thead>
                <tbody>
                  {soap.patients.map((p) => (
                    <tr className="border-b last:border-0" key={p.patientMrn}>
                      <td className="py-2 pr-3 font-mono text-xs">{p.patientMrn}</td>
                      <td className="py-2 pr-3 font-semibold">{p.patientName}</td>
                      <td className="py-2 pr-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${p.isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.completedCount}/{p.totalRounds}</span></td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{p.rounds.map((r) => `R${r.roundNumber} (${r.doctorName})`).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !soapLoading && <EmptyState message="No SOAP checkups recorded for this month" />
          )}
        </section>
      )}
    </div>
  );
}
