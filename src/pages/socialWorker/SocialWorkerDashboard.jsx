import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import PatientJourneyPanel from '../../components/common/PatientJourneyPanel';
import ScheduleCard from '../../components/common/ScheduleCard';
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
            ? <PatientJourneyPanel patient={selected} schedules={patientSchedules(selected)} sessions={patientSessions(selected)} claims={patientClaims(selected)} />
            : <EmptyState message="Click a schedule card to view that patient's bio, schedules and sessions." />}
        </section>
      </div>
    </div>
  );
}
