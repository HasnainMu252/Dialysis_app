import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { chairApi } from '../../api/chairApi';
import { scheduleApi } from '../../api/scheduleApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import { chairCodeOf, dateOnly, overlaps, personName } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const activeScheduleStatuses = ['pending', 'scheduled', 'checked_in', 'in_progress', 'approved'];
const blockedChairStatuses = ['reserved', 'in_use', 'cleaning', 'out_of_order', 'maintenance'];

export default function ScheduleCreate() {
  const [patients, setPatients] = useState([]);
  const [chairs, setChairs] = useState([]);
  const [daySchedules, setDaySchedules] = useState([]);
  const [selectedChair, setSelectedChair] = useState('');
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [form, setForm] = useState({ patientMrn: '', date: today(), startTime: '09:00', endTime: '13:00', bufferMinutes: 30, notes: 'Morning dialysis' });

  useEffect(() => {
    Promise.allSettled([patientApi.list(), chairApi.list()]).then(([p, c]) => {
      if (p.status === 'fulfilled') setPatients(p.value.data?.data || []);
      if (c.status === 'fulfilled') setChairs(c.value.data?.data || []);
    });
  }, []);

  const setValue = (field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setSelectedChair(''); setChecked(false); };

  const checkAvailability = async () => {
    if (!form.date || !form.startTime || !form.endTime) return toast.error('Select date and time first');
    if (form.startTime >= form.endTime) return toast.error('Start time must be before end time');
    setLoading(true);
    try {
      const [chairRes, scheduleRes] = await Promise.all([chairApi.list(), scheduleApi.list({ date: form.date })]);
      setChairs(chairRes.data?.data || []);
      setDaySchedules(scheduleRes.data?.schedules || []);
      setChecked(true);
      toast.success('Availability checked');
    } catch (error) { toast.error(error?.response?.data?.message || 'Failed to check availability'); }
    finally { setLoading(false); }
  };

  const chairStates = useMemo(() => {
    const map = new Map();
    chairs.forEach((chair) => {
      const code = chairCodeOf(chair);
      let state = chair.status || 'available';
      let reason = state === 'available' ? 'Available' : `Chair status: ${state}`;
      const booked = daySchedules.find((s) => {
        const scheduleChairCode = s.chair?.code || s.chairCode;
        return scheduleChairCode === code && activeScheduleStatuses.includes(String(s.status || '').toLowerCase()) && overlaps(form.startTime, form.endTime, s.startTime, s.endTime);
      });
      if (booked) { state = 'reserved'; reason = `${booked.code} ${booked.startTime}-${booked.endTime}`; }
      if (blockedChairStatuses.includes(chair.status) && !booked) { state = chair.status; reason = `Chair is ${chair.status}`; }
      map.set(code, { state, reason, chair });
    });
    return map;
  }, [chairs, daySchedules, form.startTime, form.endTime]);

  const createSchedule = async () => {
    if (!form.patientMrn) return toast.error('Select patient');
    if (!selectedChair) return toast.error('Select available chair');
    setLoading(true);
    try {
      const res = await scheduleApi.create({ ...form, chairCode: selectedChair, bufferMinutes: Number(form.bufferMinutes) || 30 });
      toast.success(`Schedule created ${res.data?.schedule?.code || ''}`);
      setChecked(false); setSelectedChair('');
    } catch (error) { toast.error(error?.response?.data?.message || 'Schedule failed'); }
    finally { setLoading(false); }
  };

  return <div className="space-y-5">
    <PageHeader title="Create Schedule" subtitle="Select patient, date and time first. Then choose a green available chair." />
    <section className="card p-5"><div className="grid gap-4 md:grid-cols-5"><div className="md:col-span-2"><label className="label">Patient</label><select className="input" value={form.patientMrn} onChange={(e) => setValue('patientMrn', e.target.value)}><option value="">Select Patient</option>{patients.map((p) => <option key={p._id} value={p.mrn}>{p.mrn} - {personName(p)} - {p.insurance?.approvalStatus || 'not_submitted'}</option>)}</select></div><div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setValue('date', e.target.value)} /></div><div><label className="label">Start</label><input className="input" type="time" value={form.startTime} onChange={(e) => setValue('startTime', e.target.value)} /></div><div><label className="label">End</label><input className="input" type="time" value={form.endTime} onChange={(e) => setValue('endTime', e.target.value)} /></div><div><label className="label">Buffer</label><input className="input" type="number" value={form.bufferMinutes} onChange={(e) => setValue('bufferMinutes', e.target.value)} /></div><div className="md:col-span-3"><label className="label">Notes</label><input className="input" value={form.notes} onChange={(e) => setValue('notes', e.target.value)} /></div><div className="flex items-end"><button type="button" className="btn-primary w-full" disabled={loading} onClick={checkAvailability}>{loading ? 'Checking...' : 'Show Available Chairs'}</button></div></div></section>
    <section className="card p-5"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Chair Grid</h2><p className="text-sm text-slate-500">{checked ? `${dateOnly(form.date)} • ${form.startTime}-${form.endTime}` : 'Check availability to enable selection.'}</p></div>{selectedChair && <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Selected {selectedChair}</div>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{chairs.map((chair) => { const code = chairCodeOf(chair); const info = chairStates.get(code) || { state: chair.status, reason: chair.status }; const available = checked && info.state === 'available'; const color = available ? 'border-green-500 bg-green-50 hover:bg-green-100' : info.state === 'cleaning' ? 'border-yellow-500 bg-yellow-50' : info.state === 'out_of_order' || info.state === 'maintenance' ? 'border-slate-400 bg-slate-100' : 'border-red-500 bg-red-50'; return <button type="button" key={chair._id} disabled={!available} onClick={() => setSelectedChair(code)} className={`rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed ${color} ${selectedChair === code ? 'ring-4 ring-blue-200' : ''}`}><div className="flex items-center justify-between"><b className="text-lg">{code}</b><StatusBadge status={info.state} /></div><p className="mt-1 text-sm text-slate-600">{chair.location || 'No location'}</p><p className="mt-1 text-xs text-slate-500">{info.reason}</p></button>; })}</div><button type="button" onClick={createSchedule} disabled={!selectedChair || loading} className="btn-primary mt-5 w-full md:w-auto">Schedule Patient</button></section>
  </div>;
}
