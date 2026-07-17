import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { medicationApi } from '../../api/medicationApi';
import { patientApi } from '../../api/patientApi';
import api from '../../api/axios';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const todayStr = new Date().toISOString().slice(0, 10);

export default function MedicationUsageReport() {
  const [scope, setScope] = useState('month'); // 'day' | 'week' | 'month' | 'range'
  const [date, setDate] = useState(todayStr);
  const [week, setWeek] = useState(todayStr);
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [patientMode, setPatientMode] = useState('all'); // 'all' | 'individual'
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load patient list once for the individual selector.
  useEffect(() => {
    patientApi.list({ limit: 1000 })
      .then((r) => setPatients(r.data?.data || r.data?.patients || []))
      .catch(() => setPatients([]));
  }, []);

  const buildParams = (extra = {}) => {
    const p = { ...extra };
    if (scope === 'day') p.date = date;
    else if (scope === 'week') p.week = week;
    else if (scope === 'range') { p.from = from; p.to = to; }
    else { p.month = month; p.year = year; }
    if (patientMode === 'individual' && patientId) p.patient = patientId;
    return p;
  };

  const load = async () => {
    if (patientMode === 'individual' && !patientId) { setData(null); return; }
    setLoading(true);
    try {
      const res = await medicationApi.usage(buildParams());
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load usage report');
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [scope, date, week, from, to, month, year, patientMode, patientId]);

  const download = async (fmt) => {
    setDownloading(true);
    try {
      const res = await api.get('/medications/usage', { params: buildParams({ format: fmt }), responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      const base = scope === 'day' ? date : scope === 'week' ? `week-${week}` : scope === 'range' ? `${from}_to_${to}` : `${year}-${String(month).padStart(2, '0')}`;
      link.href = url;
      link.download = `medication-usage-${base}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Export failed');
    } finally { setDownloading(false); }
  };

  const totals = data?.totals || [];
  const byPatient = data?.byPatient || [];
  const byDate = data?.byDate || [];
  const events = data?.events || [];
  const eventSummary = data?.eventSummary || { added: 0, stopped: 0, removed: 0 };
  const grand = data?.grand || { administrations: 0, patients: 0, medications: 0 };

  return (
    <div className="space-y-5">
      <PageHeader title="Medication Usage" subtitle="How much dialysis medication was used — by day or by month, for one patient or all patients." />

      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">Period</label>
            <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="day">Daily (end of day)</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly (end of month)</option>
              <option value="range">Date range (date-wise)</option>
            </select>
          </div>

          {scope === 'day' ? (
            <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          ) : scope === 'week' ? (
            <div><label className="label">Any day in week</label><input className="input" type="date" value={week} onChange={(e) => setWeek(e.target.value)} /></div>
          ) : scope === 'range' ? (
            <>
              <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </>
          ) : (
            <>
              <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
              <div><label className="label">Year</label><input className="input w-24" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
            </>
          )}

          <div>
            <label className="label">Patients</label>
            <select className="input" value={patientMode} onChange={(e) => setPatientMode(e.target.value)}>
              <option value="all">All patients</option>
              <option value="individual">Individual patient</option>
            </select>
          </div>

          {patientMode === 'individual' && (
            <div>
              <label className="label">Patient</label>
              <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">Select patient…</option>
                {patients.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName} — {p.mrn}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => download('xlsx')} disabled={downloading}><Download size={16} /> Excel</button>
          <button className="btn-light inline-flex items-center gap-2" onClick={() => download('csv')} disabled={downloading}><Download size={16} /> CSV</button>
        </div>
      </div>

      {patientMode === 'individual' && !patientId ? (
        <div className="card p-6"><EmptyState message="Select a patient to see their medication usage." /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-5"><p className="text-xs font-bold uppercase text-blue-500">Total Administrations</p><p className="text-3xl font-black text-blue-800">{grand.administrations}</p></div>
            <div className="card p-5"><p className="text-xs font-bold uppercase text-emerald-500">Distinct Medications</p><p className="text-3xl font-black text-emerald-800">{grand.medications}</p></div>
            <div className="card p-5"><p className="text-xs font-bold uppercase text-slate-500">Patients</p><p className="text-3xl font-black text-slate-800">{grand.patients}</p></div>
          </div>

          <div className="card overflow-x-auto p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="font-bold">Usage totals {data?.scopeLabel ? <span className="text-sm font-normal text-slate-500">— {data.scopeLabel}</span> : null}</h3>
            </div>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Medication</th><th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3 text-center">Total Dose</th><th className="px-3 py-3 text-center">Total Qty</th>
                  <th className="px-3 py-3 text-center">Administrations</th><th className="px-3 py-3 text-center">Patients</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {totals.map((t) => (
                  <tr key={`${t.name}-${t.unit}`} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-semibold">{t.name}</td>
                    <td className="px-3 py-3 text-slate-600">{t.unit || '—'}</td>
                    <td className="px-3 py-3 text-center font-bold">{t.totalDose}</td>
                    <td className="px-3 py-3 text-center">{t.totalQty}</td>
                    <td className="px-3 py-3 text-center">{t.administrations}</td>
                    <td className="px-3 py-3 text-center">{t.patients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!totals.length && !loading && <EmptyState message="No medications recorded for this period." />}
          </div>

          {!!byDate.length && (
            <div className="card overflow-x-auto p-0">
              <div className="px-4 py-3"><h3 className="font-bold">Date-wise breakdown</h3><p className="text-xs text-slate-500">Medication given per day{data?.patientName ? ` for ${data.patientName}` : ''}.</p></div>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Medications given</th>
                    <th className="px-3 py-3 text-center">Administrations</th>
                    <th className="px-3 py-3 text-center">Total Qty</th>
                    <th className="px-3 py-3 text-center">Patients</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {byDate.map((d) => (
                    <tr key={d.date} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold">{d.date}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {d.meds.map((m) => <span key={`${m.name}-${m.unit}`} className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{m.name} {m.totalDose}{m.unit ? ` ${m.unit}` : ''} × {m.totalQty}</span>)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{d.administrations}</td>
                      <td className="px-3 py-3 text-center font-bold">{d.totalQty}</td>
                      <td className="px-3 py-3 text-center">{d.patients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card overflow-x-auto p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <h3 className="font-bold">Medication changes (added / stopped / removed)</h3>
                <p className="text-xs text-slate-500">Lifecycle events in this period — dialysis and home medications, with who and when.</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700">{eventSummary.added} added</span>
                <span className="rounded-lg bg-amber-100 px-2 py-1 text-amber-700">{eventSummary.stopped} stopped</span>
                <span className="rounded-lg bg-slate-200 px-2 py-1 text-slate-600">{eventSummary.removed} removed</span>
              </div>
            </div>
            {events.length ? (
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">When</th>
                    <th className="px-3 py-3">Event</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Medication</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{e.at ? new Date(e.at).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${e.kind === 'added' ? 'bg-emerald-100 text-emerald-700' : e.kind === 'stopped' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                          {e.kind === 'added' ? 'Added' : e.kind === 'stopped' ? 'Stopped' : 'Removed'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs capitalize text-slate-500">{e.source}</td>
                      <td className="px-3 py-3 font-semibold">{e.medication}{e.dose ? <span className="font-normal text-slate-500"> {e.dose}{e.unit ? ` ${e.unit}` : ''}</span> : null}{e.reason ? <span className="block text-xs font-normal text-amber-600">Reason: {e.reason}</span> : null}</td>
                      <td className="px-3 py-3 text-xs">{e.patientName}<span className="block text-slate-400">{e.mrn}</span></td>
                      <td className="px-3 py-3 text-xs text-slate-500">{e.byName || '—'}{e.byRole ? ` (${e.byRole})` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 pb-4 text-sm text-slate-400">No medication changes in this period.</p>
            )}
          </div>

          {patientMode === 'all' && !!byPatient.length && (
            <div className="card overflow-x-auto p-0">
              <div className="px-4 py-3"><h3 className="font-bold">Per-patient breakdown</h3></div>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Patient</th><th className="px-3 py-3">MRN</th>
                    <th className="px-3 py-3">Medications</th>
                    <th className="px-3 py-3 text-center">Administrations</th><th className="px-3 py-3 text-center">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {byPatient.map((p) => (
                    <tr key={p.mrn} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-3 font-semibold">{p.patientName}</td>
                      <td className="px-3 py-3 font-mono text-xs">{p.mrn}</td>
                      <td className="px-3 py-3 text-slate-600">
                        <div className="flex flex-wrap gap-1.5">
                          {p.meds.map((m) => <span key={`${m.name}-${m.unit}`} className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{m.name} {m.totalDose}{m.unit ? ` ${m.unit}` : ''} × {m.totalQty}</span>)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{p.administrations}</td>
                      <td className="px-3 py-3 text-center font-bold">{p.totalQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
