import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { chairApi } from '../../api/chairApi';
import { chairClearanceApi } from '../../api/chairClearanceApi';
import { scheduleApi } from '../../api/scheduleApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const makeChecklist = (status) => ({
  chairChecked: true,
  machineChecked: true,
  filterChecked: status === 'available',
  solutionChecked: status === 'available',
  cleaned: status === 'available',
  safeForUse: status === 'available',
});

const chairKey = (c) => c.code || c.chairNumber;
const parseHour = (t) => { const [h] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h : null; };
const parseEndHour = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return m > 0 ? h + 1 : h; // a slot ending 13:30 occupies hour 13
};
const isSameDay = (d, ref) => {
  if (!d) return false;
  const x = new Date(d);
  return x.toISOString().slice(0, 10) === ref;
};

const STATUS_COLOR = {
  scheduled: 'bg-blue-500',
  reserved: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  checked_in: 'bg-indigo-500',
  completed: 'bg-emerald-500',
};

export default function ChairClearance() {
  const [chairs, setChairs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [chairCode, setChairCode] = useState('');
  const [status, setStatus] = useState('available');
  const [notes, setNotes] = useState('Chair cleaned and ready for next patient.');
  const [checklist, setChecklist] = useState(makeChecklist('available'));

  const load = () => {
    chairApi.list().then((res) => setChairs(res.data?.data || [])).catch(() => {});
    chairClearanceApi.list().then((res) => setHistory(res.data?.data || [])).catch(() => {});
    scheduleApi.list().then((res) => setSchedules(res.data?.schedules || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // occupancy: { [chairCode]: { [hour]: { patientName, time, status } } }
  const occupancy = useMemo(() => {
    const map = {};
    schedules
      .filter((s) => isSameDay(s.date, date) && s.status !== 'cancelled')
      .forEach((s) => {
        const code = s.chair?.code || s.chair?.chairNumber || s.chairCode;
        if (!code) return;
        const start = parseHour(s.startTime);
        const end = parseEndHour(s.endTime);
        if (start == null || end == null) return;
        map[code] = map[code] || {};
        for (let h = start; h < end && h < 24; h += 1) {
          map[code][h] = { patientName: s.patientName || 'Reserved', time: `${s.startTime}-${s.endTime}`, status: s.status };
        }
      });
    return map;
  }, [schedules, date]);

  const changeStatus = (value) => {
    setStatus(value);
    setChecklist(makeChecklist(value));
    if (value === 'maintenance') setNotes('Issue found. Chair moved to maintenance.');
    if (value === 'available') setNotes('Chair cleaned and ready for next patient.');
    if (value === 'cleaning') setNotes('Chair cleaning in progress.');
    if (value === 'out_of_order') setNotes('Chair not safe for treatment.');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!chairCode) return toast.error('Select chair');
    try {
      await chairClearanceApi.create(chairCode, { status, notes, checklist });
      toast.success('Chair clearance saved');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save chair clearance');
    }
  };

  const histPage = usePagedList(history, '', []);

  return (
    <div className="space-y-5">
      <PageHeader title="Chair Clearance & 24-Hour Occupancy" subtitle="See each chair's free and reserved hours for the day, synced with schedules, then clear chairs for the next patient." />

      <section className="card space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="label">Day</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" /> Free</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500" /> Reserved</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500" /> In treatment</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> Completed</span>
          </div>
        </div>

        {!chairs.length && <EmptyState message="No chairs found" />}

        <div className="space-y-3">
          {chairs.map((chair) => {
            const code = chairKey(chair);
            const occ = occupancy[code] || {};
            const reservedHours = Object.keys(occ).length;
            return (
              <div key={chair._id} className="rounded-2xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <b className="text-slate-900">Chair {code}</b>
                    <StatusBadge status={chair.status} />
                  </div>
                  <span className="text-xs font-bold text-slate-500">{reservedHours ? `${reservedHours}h reserved` : 'Fully free'}</span>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-[680px] gap-0.5">
                    {HOURS.map((h) => {
                      const slot = occ[h];
                      const color = slot ? (STATUS_COLOR[slot.status] || 'bg-blue-500') : 'bg-slate-100';
                      return (
                        <div key={h} className="flex-1" title={slot ? `${String(h).padStart(2, '0')}:00 · ${slot.patientName} (${slot.time})` : `${String(h).padStart(2, '0')}:00 · free`}>
                          <div className={`h-8 rounded ${color} ${slot ? '' : 'ring-1 ring-inset ring-slate-200'}`} />
                          <div className="mt-0.5 text-center text-[9px] font-semibold text-slate-400">{h}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {reservedHours > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(occ)
                      .filter(([h, slot], idx, all) => all.findIndex(([, s]) => s.time === slot.time && s.patientName === slot.patientName) === idx)
                      .map(([h, slot]) => (
                        <span key={`${h}-${slot.time}`} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{slot.patientName} · {slot.time}</span>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Clear a chair</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Chair</label>
            <select className="input" value={chairCode} onChange={(e) => setChairCode(e.target.value)}>
              <option value="">Select Chair</option>
              {chairs.map((chair) => (
                <option key={chair._id} value={chairKey(chair)}>{chairKey(chair)} - {chair.status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">New Status</label>
            <select className="input" value={status} onChange={(e) => changeStatus(e.target.value)}>
              <option value="available">available</option>
              <option value="maintenance">maintenance</option>
              <option value="cleaning">cleaning</option>
              <option value="out_of_order">out_of_order</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(checklist).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border p-3 text-sm">
              <input type="checkbox" checked={value} onChange={(event) => setChecklist({ ...checklist, [key]: event.target.checked })} />
              {key}
            </label>
          ))}
        </div>

        <button className="btn-primary">Save Chair Clearance</button>
      </form>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-extrabold text-slate-900">History</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {histPage.paged.map((item) => (
            <div className="rounded-xl border p-3 text-sm" key={item._id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>Chair {item.chairCode}</b>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-slate-600">{item.notes}</p>
              <p className="text-xs text-slate-400">{item.createdAt?.slice(0, 10)}</p>
            </div>
          ))}
        </div>
        {history.length === 0 && <EmptyState message="No chair clearance history." />}
        <Pagination page={histPage.page} pageCount={histPage.pageCount} total={histPage.total} onPage={histPage.setPage} label="records" />
      </section>
    </div>
  );
}
