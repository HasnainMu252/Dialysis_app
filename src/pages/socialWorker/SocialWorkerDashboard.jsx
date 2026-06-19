import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import PatientJourneyPanel from '../../components/common/PatientJourneyPanel';
import StatusBadge from '../../components/ui/StatusBadge';
import { dateOnly, money, personName } from '../../utils/format';

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

  const scheduledPatients = useMemo(() => patients.filter((p) => schedules.some((s) => s.patientMrn === p.mrn)), [patients, schedules]);
  const patientSchedules = (p) => schedules.filter((s) => s.patientMrn === p.mrn);
  const patientSessions = (p) => sessions.filter((s) => (s.patient?._id || s.patient) === p._id || s.patient?.mrn === p.mrn);
  const patientClaims = (p) => claims.filter((c) => (c.patient?._id || c.patient) === p._id || c.patient?.mrn === p.mrn);
  const paymentStatus = (p) => {
    const list = patientClaims(p);
    if (!list.length) return 'unpaid';
    if (list.some((c) => c.status === 'paid')) return 'paid';
    return list[0].status || 'pending';
  };

  return <div className="space-y-5"><PageHeader title="Social Worker Dashboard" subtitle="Scheduled patients with bio data, phone, address, payment status and treatment history for travel/support assistance." />
    <div className="grid gap-4 md:grid-cols-4"><div className="card p-4"><p className="text-xs text-slate-500">Scheduled Patients</p><p className="text-2xl font-bold">{scheduledPatients.length}</p></div><div className="card p-4"><p className="text-xs text-slate-500">Paid</p><p className="text-2xl font-bold">{scheduledPatients.filter((p) => paymentStatus(p) === 'paid').length}</p></div><div className="card p-4"><p className="text-xs text-slate-500">Unpaid/Pending</p><p className="text-2xl font-bold">{scheduledPatients.filter((p) => paymentStatus(p) !== 'paid').length}</p></div><div className="card p-4"><p className="text-xs text-slate-500">Sessions</p><p className="text-2xl font-bold">{sessions.length}</p></div></div>
    <div className="grid gap-5 xl:grid-cols-3"><section className="space-y-3 xl:col-span-1">{scheduledPatients.map((p) => { const next = patientSchedules(p)[0]; const claimsForPatient = patientClaims(p); return <button key={p._id} onClick={() => setSelected(p)} className={`card w-full p-4 text-left transition ${selected?._id === p._id ? 'ring-2 ring-blue-500' : ''}`}><div className="flex items-start justify-between gap-2"><div><b>{personName(p)}</b><p className="text-xs text-slate-500">{p.mrn} • {p.phone}</p><p className="text-xs text-slate-500">{p.address || 'No address'}</p></div><StatusBadge status={paymentStatus(p)} /></div><div className="mt-2 text-xs text-slate-500">Next: {next ? `${dateOnly(next.date)} ${next.startTime}-${next.endTime} Chair ${next.chair?.code || '-'}` : 'No schedule'}</div><div className="text-xs text-slate-500">Claims: {claimsForPatient.length} • Rs {money(claimsForPatient.reduce((a, c) => a + Number(c.amount || 0), 0))}</div></button>; })}{!scheduledPatients.length && <EmptyState message="No scheduled patients found" />}</section><section className="xl:col-span-2">{selected ? <PatientJourneyPanel patient={selected} schedules={patientSchedules(selected)} sessions={patientSessions(selected)} claims={patientClaims(selected)} /> : <EmptyState message="Click a patient to view bio data, schedules and previous sessions." />}</section></div>
  </div>;
}
