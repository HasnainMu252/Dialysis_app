import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { chairApi } from '../../api/chairApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import PatientBoard from '../../components/common/PatientBoard';
import { CHAIR_STATUS } from '../../constants';
import { dateOnly, personName } from '../../utils/format';

export default function TechnicianDashboard() {
  const [chairs, setChairs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    try {
      const [c, sc] = await Promise.allSettled([chairApi.list(), scheduleApi.today()]);
      if (c.status === 'fulfilled') setChairs(c.value.data?.data || []);
      if (sc.status === 'fulfilled') setSchedules(sc.value.data?.schedules || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load technician dashboard');
    }
  };
  useEffect(() => { load(); }, []);

  // Expired schedules drop out of the active "today" list (still visible in Schedules).
  const todaySchedules = schedules.filter((s) => !s.expired);

  return (
    <div className="space-y-5">
      <PageHeader title="Technician Dashboard" subtitle="Chair status, maintenance clearance, and today's scheduled patient workflow. Chair creation is admin/front desk only." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CHAIR_STATUS.map((s) => (
          <div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{chairs.filter((c) => c.status === s).length}</p></div>
        ))}
      </div>

      <PatientBoard detailBase="/patients" />

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="space-y-3">
          <h2 className="font-bold">Chair Status</h2>
          {chairs.map((c) => (
            <div className="card p-4" key={c._id}><div className="flex justify-between gap-2"><div><b>{c.code || c.chairNumber}</b><p className="text-xs text-slate-500">{c.location}</p><p className="text-xs text-slate-400">{c.conditionNotes}</p></div><StatusBadge status={c.status} /></div></div>
          ))}
        </section>
        <section className="space-y-3 xl:col-span-2">
          <h2 className="font-bold">Today's Scheduled Patients</h2>
          {todaySchedules.map((s) => (
            <div key={s.id || s._id} className="card p-4"><div className="flex justify-between gap-2"><div><b>{s.patientName || personName({})}</b><p className="text-xs text-slate-500">{s.patientMrn} • {s.patientPhone}</p><p className="text-xs text-slate-500">{dateOnly(s.date)} • {s.startTime}-{s.endTime} • Chair {s.chair?.code}</p></div><StatusBadge status={s.expired ? 'expired' : s.status} /></div></div>
          ))}
          {!todaySchedules.length && <EmptyState message="No active schedules for today" />}
        </section>
      </div>
    </div>
  );
}
