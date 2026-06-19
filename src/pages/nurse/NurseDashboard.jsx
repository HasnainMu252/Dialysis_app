import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sessionApi } from '../../api/sessionApi';
import { scheduleApi } from '../../api/scheduleApi';
import { patientApi } from '../../api/patientApi';
import { billingApi } from '../../api/billingApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import PatientJourneyPanel from '../../components/common/PatientJourneyPanel';
import { dateOnly, personName } from '../../utils/format';

export default function NurseDashboard(){
  const [sessions,setSessions]=useState([]); const [schedules,setSchedules]=useState([]); const [patients,setPatients]=useState([]); const [claims,setClaims]=useState([]); const [selected,setSelected]=useState(null);
  const load=async()=>{try{const [se,sc,p,cl]=await Promise.allSettled([sessionApi.list(),scheduleApi.list(),patientApi.list(),billingApi.listClaims()]); if(se.status==='fulfilled') setSessions(se.value.data?.data||[]); if(sc.status==='fulfilled') setSchedules(sc.value.data?.schedules||[]); if(p.status==='fulfilled') setPatients(p.value.data?.data||[]); if(cl.status==='fulfilled') setClaims(cl.value.data?.data||[]);}catch(e){toast.error(e?.response?.data?.message||'Failed to load nurse dashboard')}};
  useEffect(()=>{load()},[]);
  const patientForSession=(s)=> typeof s.patient==='object' ? s.patient : patients.find((p)=>p._id===s.patient);
  const patientSchedules=(p)=>schedules.filter((s)=>s.patientMrn===p?.mrn);
  const patientSessions=(p)=>sessions.filter((s)=>(s.patient?._id||s.patient)===p?._id || s.patient?.mrn===p?.mrn);
  const patientClaims=(p)=>claims.filter((c)=>(c.patient?._id||c.patient)===p?._id || c.patient?.mrn===p?.mrn);
  return <div className="space-y-5"><PageHeader title="Nurse Dashboard" subtitle="Treatment flow, schedules, patient bio data, vitals, SOAP and complete session history." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{['scheduled','checked_in','ready','in_progress','completed'].map((s)=><div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{sessions.filter((x)=>x.status===s).length}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-3"><section className="space-y-3"><h2 className="font-bold">Patients / Sessions</h2>{sessions.map((s)=>{const p=patientForSession(s); return <button key={s._id} onClick={()=>setSelected(p)} className="card w-full p-4 text-left"><div className="flex justify-between gap-2"><div><b>{personName(p)}</b><p className="text-xs text-slate-500">{p?.mrn} • {p?.phone}</p><p className="text-xs text-slate-500">{dateOnly(s.createdAt)} • Chair {s.chair?.code||s.chair?.chairNumber||s.chair}</p></div><StatusBadge status={s.status}/></div></button>})}{!sessions.length&&<EmptyState message="No sessions found"/>}</section><section className="xl:col-span-2">{selected?<PatientJourneyPanel patient={selected} schedules={patientSchedules(selected)} sessions={patientSessions(selected)} claims={patientClaims(selected)}/>:<EmptyState message="Click a patient/session to view full treatment history."/>}</section></div>
  </div>
}
