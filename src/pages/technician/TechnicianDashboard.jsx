import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { chairApi } from '../../api/chairApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { patientApi } from '../../api/patientApi';
import { billingApi } from '../../api/billingApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import PatientJourneyPanel from '../../components/common/PatientJourneyPanel';
import { CHAIR_STATUS } from '../../constants';
import { dateOnly, personName } from '../../utils/format';

export default function TechnicianDashboard() {
  const [chairs, setChairs] = useState([]); const [schedules, setSchedules] = useState([]); const [sessions, setSessions] = useState([]); const [patients, setPatients] = useState([]); const [claims, setClaims] = useState([]); const [selected, setSelected] = useState(null);
  const today = new Date().toISOString().slice(0,10);
  const load = async () => { try { const [c, sc, se, p, cl] = await Promise.allSettled([chairApi.list(), scheduleApi.today(), sessionApi.list(), patientApi.list(), billingApi.listClaims()]); if(c.status==='fulfilled') setChairs(c.value.data?.data||[]); if(sc.status==='fulfilled') setSchedules(sc.value.data?.schedules||[]); if(se.status==='fulfilled') setSessions(se.value.data?.data||[]); if(p.status==='fulfilled') setPatients(p.value.data?.data||[]); if(cl.status==='fulfilled') setClaims(cl.value.data?.data||[]); } catch(e){ toast.error(e?.response?.data?.message || 'Failed to load technician dashboard'); } };
  useEffect(()=>{load();},[]);
  const todaySchedules = schedules.filter((s)=>dateOnly(s.date)===today || schedules.length);
  const findPatient = (mrn) => patients.find((p)=>p.mrn===mrn);
  const patientSessions = (p) => sessions.filter((s)=>(s.patient?._id||s.patient)===p?._id || s.patient?.mrn===p?.mrn);
  const patientClaims = (p) => claims.filter((c)=>(c.patient?._id||c.patient)===p?._id || c.patient?.mrn===p?.mrn);
  const patientSchedules = (p) => schedules.filter((s)=>s.patientMrn===p?.mrn);
  return <div className="space-y-5"><PageHeader title="Technician Dashboard" subtitle="Chair status, maintenance clearance, and today's scheduled patient workflow. Chair creation is admin/front desk only." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{CHAIR_STATUS.map((s)=><div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{chairs.filter((c)=>c.status===s).length}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-3"><section className="space-y-3"><h2 className="font-bold">Chair Status</h2>{chairs.map((c)=><div className="card p-4" key={c._id}><div className="flex justify-between gap-2"><div><b>{c.code||c.chairNumber}</b><p className="text-xs text-slate-500">{c.location}</p><p className="text-xs text-slate-400">{c.conditionNotes}</p></div><StatusBadge status={c.status}/></div></div>)}</section><section className="space-y-3 xl:col-span-2"><h2 className="font-bold">Today's Scheduled Patients</h2>{todaySchedules.map((s)=>{ const p=findPatient(s.patientMrn); return <button key={s.id||s._id} onClick={()=>setSelected(p)} className="card w-full p-4 text-left"><div className="flex justify-between gap-2"><div><b>{s.patientName || personName(p)}</b><p className="text-xs text-slate-500">{s.patientMrn} • {p?.phone || s.patientPhone}</p><p className="text-xs text-slate-500">{dateOnly(s.date)} • {s.startTime}-{s.endTime} • Chair {s.chair?.code}</p></div><StatusBadge status={s.status}/></div></button>})}{!todaySchedules.length && <EmptyState message="No schedules for today"/>}{selected && <div className="mt-4"><PatientJourneyPanel patient={selected} schedules={patientSchedules(selected)} sessions={patientSessions(selected)} claims={patientClaims(selected)} /></div>}</section></div>
  </div>;
}
