import { useEffect, useMemo, useState } from 'react';
import { Activity, Armchair, CalendarDays, CreditCard, TrendingUp, Users, RefreshCw } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { patientApi } from '../../api/patientApi';
import { chairApi } from '../../api/chairApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import { useAuth } from '../../context/AuthContext';

const arr = (payload, key) => payload?.[key] || payload?.data || [];
const safeCount = (payload, key) => payload?.count ?? arr(payload, key).length ?? 0;

export default function DashboardStats({ title, subtitle, accent = 'admin' }) {
  const { user } = useAuth();
  const canBilling = ['admin', 'biller'].includes(user?.role);

  const [stats, setStats] = useState({ patients: '--', chairs: '--', schedules: '--', sessions: '--', claims: '--' });
  const [raw, setRaw] = useState({ schedules: [], sessions: [], claims: [] });
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    // Only request billing claims for roles allowed to see them (avoids 403 noise).
    const calls = [
      patientApi.list(),
      chairApi.list(),
      scheduleApi.list(),
      sessionApi.list(),
      canBilling ? billingApi.listClaims() : Promise.resolve(null),
    ];
    Promise.allSettled(calls).then((results) => {
      const schedules = results[2].status === 'fulfilled' ? arr(results[2].value.data, 'schedules') : [];
      const sessions = results[3].status === 'fulfilled' ? arr(results[3].value.data, 'data') : [];
      const claims = canBilling && results[4].status === 'fulfilled' && results[4].value ? arr(results[4].value.data, 'data') : [];
      setStats({
        patients: results[0].status === 'fulfilled' ? safeCount(results[0].value.data, 'data') : '--',
        chairs: results[1].status === 'fulfilled' ? safeCount(results[1].value.data, 'data') : '--',
        schedules: results[2].status === 'fulfilled' ? safeCount(results[2].value.data, 'schedules') : '--',
        sessions: results[3].status === 'fulfilled' ? safeCount(results[3].value.data, 'data') : '--',
        claims: canBilling && results[4].status === 'fulfilled' && results[4].value ? safeCount(results[4].value.data, 'data') : '--',
      });
      setRaw({ schedules, sessions, claims });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const insights = useMemo(() => {
    const scheduled = raw.schedules.filter((x) => ['scheduled', 'Scheduled'].includes(x.status || x.state)).length;
    const activeSessions = raw.sessions.filter((x) => ['checked_in', 'in_progress', 'ready'].includes(x.status || x.state)).length;
    const paidClaims = raw.claims.filter((x) => x.status === 'paid').length;
    const deniedClaims = raw.claims.filter((x) => x.status === 'denied').length;
    return { scheduled, activeSessions, paidClaims, deniedClaims };
  }, [raw]);

  const gradient = accent === 'insurance'
    ? 'from-blue-700 via-cyan-600 to-emerald-500'
    : 'from-slate-950 via-blue-950 to-blue-700';

  return (
    <div className="space-y-5">
      <div className={`overflow-hidden rounded-[2rem] bg-gradient-to-r ${gradient} p-5 text-white shadow-2xl shadow-blue-200 sm:p-6`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-50"><TrendingUp size={14}/> Live Reports Overview</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-50/90 sm:text-base">{subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4 lg:min-w-[28rem]">
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/10"><p className="text-blue-50/80">Scheduled</p><p className="mt-1 text-2xl font-black">{insights.scheduled}</p></div>
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/10"><p className="text-blue-50/80">Active</p><p className="mt-1 text-2xl font-black">{insights.activeSessions}</p></div>
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/10"><p className="text-blue-50/80">Paid</p><p className="mt-1 text-2xl font-black">{insights.paidClaims}</p></div>
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/10"><p className="text-blue-50/80">Denied</p><p className="mt-1 text-2xl font-black">{insights.deniedClaims}</p></div>
          </div>
        </div>
        <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Patients" value={stats.patients} icon={Users} />
        <StatCard title="Chairs" value={stats.chairs} icon={Armchair} />
        <StatCard title="Schedules" value={stats.schedules} icon={CalendarDays} />
        <StatCard title="Sessions" value={stats.sessions} icon={Activity} />
        <StatCard title="Claims" value={stats.claims} icon={CreditCard} />
      </div>
    </div>
  );
}
