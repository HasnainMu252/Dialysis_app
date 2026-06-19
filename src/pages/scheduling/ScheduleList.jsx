import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { dateOnly } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { canManageSchedule } from '../../utils/permissions';

const matchSchedule = (s, search) => {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [s.code, s.patientMrn, s.patientName, s.patientPhone, s.chair?.code, s.chair?.name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
};

const isPastOrCompleted = (s) => {
  const today = new Date().toISOString().slice(0, 10);
  return ['completed', 'cancelled', 'no_show'].includes(String(s.status || '').toLowerCase()) || dateOnly(s.date) < today;
};

export default function ScheduleList() {
  const { user } = useAuth();
  const canManage = canManageSchedule(user?.role);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [session, setSession] = useState(null);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('Patient requested cancellation');

  const currentItems = useMemo(() => items.filter((s) => !isPastOrCompleted(s)), [items]);
  const historyItems = useMemo(() => items.filter(isPastOrCompleted), [items]);
  const filtered = useMemo(() => currentItems.filter((s) => matchSchedule(s, search)), [currentItems, search]);

  const load = async () => {
    try {
      const res = await scheduleApi.list(date ? { date } : {});
      setItems(res.data?.schedules || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load schedules');
    }
  };

  useEffect(() => { load(); }, []);

  const view = async (s) => {
    setSelected(s);
    setSession(null);
    try {
      const ses = await sessionApi.list({ schedule: s.id });
      const current = (ses.data?.data || [])[0];
      setSession(current);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load schedule detail');
    }
  };

  const doAction = async (label, fn) => {
    if (!selected?.code) return;
    try {
      await fn();
      toast.success(label);
      await load();
      const refreshed = await scheduleApi.get(selected.code).catch(() => null);
      if (refreshed?.data?.schedule) view(refreshed.data.schedule);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Action failed');
    }
  };

  const deleteSchedule = async () => {
    if (!window.confirm(`Delete schedule ${selected.code}?`)) return;
    await doAction('Schedule deleted', () => scheduleApi.delete(selected.code));
    setSelected(null); setSession(null);
  };

  return <div className="space-y-5"><PageHeader title="Schedules" subtitle="Current/upcoming schedules only. Completed and past schedules move to history. Chair date and time are clearly shown to avoid double booking." />
    <div className="card grid gap-3 p-4 md:grid-cols-5"><input className="input md:col-span-2" placeholder="Search phone / name / MRN / schedule" value={search} onChange={(e) => setSearch(e.target.value)} /><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button className="btn-light" onClick={load}>Load</button><button className="btn-light" onClick={() => { setDate(''); setSearch(''); setTimeout(load, 0); }}>Reset</button></div>
    <div className="grid gap-5 xl:grid-cols-3"><section className="space-y-3 xl:col-span-1">{filtered.map((s) => <button key={s.id || s.code} onClick={() => view(s)} className={`card w-full p-4 text-left ${selected?.id === s.id ? 'ring-2 ring-blue-500' : ''}`}><div className="flex justify-between gap-2"><div><b>{s.code}</b><p className="text-xs text-slate-500">{s.patientName} • {s.patientMrn}</p><p className="text-xs text-slate-500">{s.patientPhone || 'No phone'} • Chair {s.chair?.code}</p><p className="text-xs text-slate-500">{dateOnly(s.date)} • {s.startTime}-{s.endTime}</p></div><StatusBadge status={s.status} /></div></button>)}{!filtered.length && <EmptyState message="No schedules found" />}</section>
      <section className="xl:col-span-2">{!selected && <EmptyState message="Click a schedule to view details." />}{selected && <div className="space-y-4"><div className="card p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-bold">{selected.code}</h2><p className="text-sm text-slate-500">{selected.patientName} • {selected.patientMrn} • {selected.patientPhone}</p></div><StatusBadge status={selected.status} /></div><div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><span className="text-slate-500">Chair</span><br />{selected.chair?.code} • {selected.chair?.location}</div><div><span className="text-slate-500">Date</span><br />{dateOnly(selected.date)}</div><div><span className="text-slate-500">Time</span><br />{selected.startTime}-{selected.endTime}</div></div>{canManage && <><div className="mt-4 grid gap-3 md:grid-cols-4"><button className="btn-light" onClick={() => doAction('Schedule approved', () => scheduleApi.approve(selected.code))}>Approve</button><button className="btn-light" onClick={() => doAction('Schedule rejected', () => scheduleApi.reject(selected.code, { reason }))}>Reject</button><button className="btn-light" onClick={() => doAction('Cancel requested', () => scheduleApi.cancel(selected.code, { reason }))}>Cancel</button><button className="btn-danger" onClick={deleteSchedule}>Delete</button></div><input className="input mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancel/reject" /></>} {!canManage && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">View only access. Approval, reject, cancel and delete actions are hidden for your role.</div>}</div>
        <div className="card p-5"><h3 className="mb-3 font-bold">Assigned Session</h3>{session ? <div className="text-sm"><div className="flex justify-between"><b>{session._id}</b><StatusBadge status={session.status} /></div><p>Vitals: {session.vitals?.length || 0} • SOAP: {session.soapNotes?.length || 0}</p><p>{session.treatmentSummary}</p></div> : <p className="text-sm text-slate-500">No session found. Old schedules may not have auto-created sessions.</p>}</div></div>}</section></div>
    <section className="card p-5"><h3 className="mb-3 font-bold">Past / Completed Schedule History</h3>{historyItems.length ? <div className="grid gap-2 md:grid-cols-2">{historyItems.slice(0, 20).map((s) => <div className="rounded-xl border bg-slate-50 p-3 text-sm" key={s.id || s.code}><div className="flex justify-between"><b>{s.code}</b><StatusBadge status={s.status} /></div><p>{s.patientName} • {dateOnly(s.date)} • Chair {s.chair?.code || s.chairCode} • {s.startTime}-{s.endTime}</p></div>)}</div> : <p className="text-sm text-slate-500">No past/completed schedules.</p>}</section>
  </div>;
}
