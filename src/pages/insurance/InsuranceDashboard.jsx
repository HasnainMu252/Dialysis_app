import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CalendarClock, CheckCircle2, FileWarning, Users, CalendarDays, UserPlus } from 'lucide-react';
import DashboardStats from '../../components/dashboard/DashboardStats';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import { insuranceFormApi } from '../../api/insuranceFormApi';
import { dateOnly, personName } from '../../utils/format';

const daysLeft = (date) => {
  if (!date) return null;
  const today = new Date();
  const target = new Date(date);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const levelClass = (level, days) => {
  if (level === 'expired' || (days !== null && days < 0)) return 'bg-red-700 text-white';
  if (level === 'critical' || (days !== null && days <= 15)) return 'bg-red-600 text-white';
  if (level === 'warning' || (days !== null && days <= 30)) return 'bg-amber-100 text-amber-800';
  if (level === 'six_months' || (days !== null && days <= 180)) return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-700';
};

const normalizeForm = (item) => {
  const expiryDate = item.expiryDate || item.dueDate || item.approvalValidTo || item.insurance?.expiryDate || item.insurance?.approvalValidTo;
  const remaining = item.daysLeft ?? daysLeft(expiryDate);
  return {
    ...item,
    expiryDate,
    daysLeft: remaining,
    level: item.level || (remaining === null ? 'unknown' : remaining < 0 ? 'expired' : remaining <= 15 ? 'critical' : remaining <= 30 ? 'warning' : remaining <= 180 ? 'six_months' : 'normal'),
  };
};

export default function InsuranceDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      try {
        const res = await insuranceFormApi.insurancePersonDashboard();
        const data = res.data?.data || {};
        setDashboard(data);
        setExpiring((data.expiryList || []).map(normalizeForm));
      } catch (_error) {
        const res = await insuranceFormApi.expiring();
        const list = (res.data?.data || []).map(normalizeForm);
        setDashboard(null);
        setExpiring(list);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load insurance dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const source = expiring;
    return {
      totalPatients: dashboard?.totalPatients ?? '-',
      critical15Days: dashboard?.critical15DaysCount ?? source.filter((x) => x.level === 'critical').length,
      oneMonth: dashboard?.oneMonthCount ?? source.filter((x) => x.level === 'warning').length,
      sixMonths: dashboard?.sixMonthsCount ?? source.filter((x) => x.level === 'six_months').length,
      expired: dashboard?.expiredCount ?? source.filter((x) => x.level === 'expired').length,
      documents: source.reduce((sum, x) => sum + (x.documentsCount ?? x.documents?.length ?? 0), 0),
    };
  }, [dashboard, expiring]);

  const priorityList = useMemo(() => [...expiring].sort((a, b) => {
    const da = a.daysLeft ?? 99999;
    const db = b.daysLeft ?? 99999;
    return da - db;
  }), [expiring]);

  return <div className="space-y-5">
    <DashboardStats title="Insurance Person Dashboard" subtitle="Register patients, update insurance forms, upload documents and track expiry duties." accent="insurance" />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard title="Total Patients" value={counts.totalPatients} icon={Users} />
      <StatCard title="Expired" value={counts.expired} icon={FileWarning} />
      <StatCard title="≤ 15 Days" value={counts.critical15Days} icon={Bell} />
      <StatCard title="≤ 1 Month" value={counts.oneMonth} icon={CalendarClock} />
      <StatCard title="≤ 6 Months" value={counts.sixMonths} icon={CheckCircle2} />
      <StatCard title="Documents" value={counts.documents} icon={Bell} />
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <Link className="card block p-5 transition hover:ring-2 hover:ring-blue-500" to="/patients/new"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UserPlus /></div><h3 className="font-bold">Register New Patient</h3><p className="text-sm text-slate-500">Open the full registration, insurance and documents flow.</p></Link>
      <Link className="card block p-5 transition hover:ring-2 hover:ring-blue-500" to="/patients"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Users /></div><h3 className="font-bold">Patients / Insurance Forms</h3><p className="text-sm text-slate-500">Edit patient bio, insurance details and documents.</p></Link>
      <Link className="card block p-5 transition hover:ring-2 hover:ring-blue-500" to="/schedules"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><CalendarDays /></div><h3 className="font-bold">Schedules View Only</h3><p className="text-sm text-slate-500">View patient schedules without create/edit access.</p></Link>
      <Link className="card block p-5 transition hover:ring-2 hover:ring-blue-500" to="/notifications"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Bell /></div><h3 className="font-bold">Notifications</h3><p className="text-sm text-slate-500">Review 15-day expiry reminders and alerts.</p></Link>
    </div>

    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-bold">Insurance Expiry Duty List</h3><p className="text-sm text-slate-500">Red means expired or 15 days left. Warning means one month. Blue means within six months.</p></div>
        <button className="btn-light" onClick={load}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {!priorityList.length ? <EmptyState message="No insurance expiry records found" /> : <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Patient</th><th className="px-3 py-3">MRN</th><th className="px-3 py-3">Primary</th><th className="px-3 py-3">Expiry / Due</th><th className="px-3 py-3">Days Left</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Docs</th><th className="px-3 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {priorityList.map((item) => {
              const patientId = item.patient?._id || item.patient?.id || item.patient || '';
              const patient = item.patient || {};
              const remaining = item.daysLeft;
              return <tr className="hover:bg-slate-50" key={item._id || `${item.patientMrn}-${item.expiryDate}`}>
                <td className="px-3 py-3 font-semibold text-slate-900">{patient?.firstName ? personName(patient) : item.patientMrn}</td>
                <td className="px-3 py-3">{patient?.mrn || item.patientMrn || '-'}</td>
                <td className="px-3 py-3">{item.primaryInsurance?.providerName || item.providerName || '-'}</td>
                <td className="px-3 py-3 font-semibold">{dateOnly(item.expiryDate)}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${levelClass(item.level, remaining)}`}>{remaining === null ? 'No date' : remaining < 0 ? `${Math.abs(remaining)} days expired` : `${remaining} days`}</span></td>
                <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><StatusBadge status={item.formStatus || 'submitted'} /><StatusBadge status={item.approvalStatus || 'pending'} /></div></td>
                <td className="px-3 py-3">{item.documentsCount ?? item.documents?.length ?? 0}</td>
                <td className="px-3 py-3"><Link className="btn-light inline-block" to={`/patients/${patient?.mrn || patientId}`}>Open</Link></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </section>
  </div>;
}
