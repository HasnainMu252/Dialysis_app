import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ScheduleCard from '../../components/common/ScheduleCard';
import { personName } from '../../utils/format';
import StatCard from '../../components/ui/StatCard';
import { CalendarDays, CalendarRange, Users, CalendarCheck } from 'lucide-react';

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export default function SocialWorkerDashboard() {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const [p, sch, ses, cl] = await Promise.allSettled([patientApi.list(), scheduleApi.list(), sessionApi.list(), billingApi.listClaims()]);
      if (p.status === 'fulfilled') setPatients(p.value.data?.data || []);
      if (sch.status === 'fulfilled') setSchedules(sch.value.data?.schedules || []);
      if (ses.status === 'fulfilled') setSessions(ses.value.data?.data || []);
      if (cl.status === 'fulfilled') setClaims(cl.value.data?.data || []);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to load social worker dashboard'); }
  };
  useEffect(() => { load(); }, []);

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; }, []);

  // Most recent first
  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [schedules]
  );
  const todaySchedules = useMemo(() => schedules.filter((s) => s.date && isSameDay(s.date, today)), [schedules, today]);
  const tomorrowSchedules = useMemo(() => schedules.filter((s) => s.date && isSameDay(s.date, tomorrow)), [schedules, tomorrow]);
  const monthSchedules = useMemo(
    () => schedules.filter((s) => { if (!s.date) return false; const d = new Date(s.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }),
    [schedules, today]
  );

  const patientByMrn = (mrn) => patients.find((p) => p.mrn === mrn);
  const patientSchedules = (p) => schedules.filter((s) => s.patientMrn === p.mrn);
  const patientSessions = (p) => sessions.filter((s) => (s.patient?._id || s.patient) === p._id || s.patient?.mrn === p.mrn);
  const patientClaims = (p) => claims.filter((c) => (c.patient?._id || c.patient) === p._id || c.patient?.mrn === p.mrn);
  const openSchedule = (s) => { const p = patientByMrn(s.patientMrn); if (p) setSelected(p); };

  const renderCards = (list) => (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((s, i) => <ScheduleCard key={s.id || s.code} schedule={s} index={i + 1} onClick={() => openSchedule(s)} />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Social Worker Dashboard" subtitle="Schedules, patient counts and support overview for travel/assistance coordination." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Schedules" value={schedules.length} icon={CalendarDays} />
        <StatCard title="Total Patients" value={patients.length} icon={Users} />
        <StatCard title="Today's Schedule" value={todaySchedules.length} icon={CalendarCheck} />
        <StatCard title="This Month's Schedule" value={monthSchedules.length} icon={CalendarRange} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">Today</h2><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{todaySchedules.length}</span></div>
            {todaySchedules.length ? renderCards(todaySchedules) : <EmptyState message="No schedules today" />}
          </section>

          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">Tomorrow</h2><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{tomorrowSchedules.length}</span></div>
            {tomorrowSchedules.length ? renderCards(tomorrowSchedules) : <EmptyState message="No schedules tomorrow" />}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-extrabold text-slate-900">All Schedules (latest first)</h2>
            {sortedSchedules.length ? renderCards(sortedSchedules.slice(0, 30)) : <EmptyState message="No schedules found" />}
          </section>
        </div>

        <section className="xl:col-span-1">
          {selected
            ? (
              <div className="card space-y-3 p-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{personName(selected)}</h3>
                  <p className="text-sm text-slate-500">{selected.mrn} • {selected.phone || 'No phone'}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">
                  Social worker view: schedules and support coordination only. Full medical and insurance bio data is not shown for this role.
                </div>
                <div>
                  <h4 className="mb-2 font-bold text-slate-800">Schedule History</h4>
                  <div className="space-y-2">
                    {patientSchedules(selected).map((s) => (
                      <div key={s.id || s._id || s.code} className="rounded-xl border p-3 text-sm">
                        <div className="flex justify-between gap-2"><b>{s.code}</b><span className="text-xs text-slate-500">{s.status}</span></div>
                        <p className="text-slate-600">{s.date ? new Date(s.date).toISOString().slice(0, 10) : '-'} • {s.startTime}-{s.endTime}</p>
                      </div>
                    ))}
                    {!patientSchedules(selected).length && <p className="text-sm text-slate-500">No schedules found.</p>}
                  </div>
                </div>
              </div>
            )
            : <EmptyState message="Click a schedule card to view that patient's schedules and support info." />}
        </section>
      </div>
    </div>
  );
}
