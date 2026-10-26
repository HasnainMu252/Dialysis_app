import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, Plus, ChevronDown, ChevronUp, Activity, Package } from 'lucide-react';
import { chairApi } from '../../api/chairApi';
import { chairClearanceApi, MAINTENANCE_TYPES } from '../../api/chairClearanceApi';
import { sessionApi } from '../../api/sessionApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { CHAIR_STATUS, statusColor } from '../../constants';
import { personName } from '../../utils/format';

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const CHECKS = [
  ['chairChecked', 'Chair checked'],
  ['machineChecked', 'Machine checked'],
  ['filterChecked', 'Filter checked'],
  ['solutionChecked', 'Solution checked'],
  ['cleaned', 'Cleaned'],
  ['safeForUse', 'Safe for use'],
];
const BLANK_MAINT = { status: 'maintenance', maintenanceType: 'Repair', notes: '', checklist: {} };
const codeOf = (c) => c.code || c.chairNumber;

function Field({ label: lbl, children }) {
  return <label className="flex flex-col gap-1"><span className={label}>{lbl}</span>{children}</label>;
}

export default function BiomedDashboard() {
  const [chairs, setChairs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', room: '', type: 'Dialysis Chair' });
  const [expanded, setExpanded] = useState(null);
  const [maintFor, setMaintFor] = useState(null);
  const [maint, setMaint] = useState({ ...BLANK_MAINT });

  const load = () => {
    setLoading(true);
    Promise.all([
      chairApi.list(),
      sessionApi.list({ status: 'in_progress' }),
      chairClearanceApi.list(),
    ])
      .then(([c, s, cl]) => {
        setChairs(c.data?.data || []);
        setSessions(s.data?.data || []);
        setClearances(cl.data?.data || []);
      })
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load stations'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // chair id -> the in-progress session (and patient) on it right now
  const liveByChair = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { const id = s.chair?._id || s.chair; if (id) m[String(id)] = s; });
    return m;
  }, [sessions]);

  // chairCode -> maintenance/clearance records
  const maintByChair = useMemo(() => {
    const m = {};
    clearances.forEach((r) => {
      const k = r.chairCode || r.chair?.code;
      if (!k) return;
      (m[k] = m[k] || []).push(r);
    });
    return m;
  }, [clearances]);

  const counts = useMemo(() => {
    const c = { total: chairs.length, in_use: 0, maintenance: 0, out_of_order: 0 };
    chairs.forEach((ch) => { if (c[ch.status] !== undefined) c[ch.status] += 1; });
    return c;
  }, [chairs]);

  // A record needs Biomed only if it is a real machine issue — not a routine
  // clean that already returned the chair to "available". This keeps the queue
  // from being flooded by day-to-day cleaning clearances.
  const needsBiomed = (r) => {
    if (r.resolved) return false;
    const routine = !r.maintenanceType || r.maintenanceType === 'Routine clean';
    const backInService = !r.status || r.status === 'available';
    return !(routine && backInService);
  };

  // Open maintenance reports awaiting Biomed, newest first.
  const openReports = useMemo(
    () => clearances
      .filter(needsBiomed)
      .sort((a, b) => new Date(b.clearedAt || b.createdAt) - new Date(a.clearedAt || a.createdAt)),
    [clearances]
  );

  const resolveReport = async (record) => {
    try {
      await chairClearanceApi.resolve(record._id);
      toast.success('Marked as handled');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update');
    }
  };

  const createStation = async () => {
    try {
      await chairApi.create(form);
      toast.success('Station added');
      setForm({ name: '', location: '', room: '', type: 'Dialysis Chair' });
      setAdding(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not add station');
    }
  };

  const setStatus = async (chair, status) => {
    try {
      await chairApi.updateStatus(codeOf(chair) || chair._id, { status });
      toast.success(`Station set to ${status.replace('_', ' ')}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Status update failed');
    }
  };

  const recordMaint = async (chair) => {
    try {
      await chairClearanceApi.create(codeOf(chair), {
        status: maint.status,
        maintenanceType: maint.maintenanceType,
        notes: maint.notes,
        checklist: maint.checklist,
      });
      toast.success('Maintenance recorded');
      setMaint({ ...BLANK_MAINT });
      setMaintFor(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not record maintenance');
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biomed — Stations"
        subtitle="All dialysis stations/chairs, their live status and maintenance flow sheet."
        action={
          <div className="flex gap-2">
            <Link to="/technician/maintenance" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Wrench size={16} /> Station Maintenance</Link>
            <Link to="/billing/inventory" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Package size={16} /> Inventory</Link>
            <button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700"><Plus size={18} /> Add Station</button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Stations" value={counts.total} icon={Wrench} />
        <StatCard title="In Use" value={counts.in_use} icon={Activity} />
        <StatCard title="In Maintenance" value={counts.maintenance} icon={Wrench} />
        <StatCard title="Out of Order" value={counts.out_of_order} icon={Wrench} />
        <StatCard title="Open Reports" value={openReports.length} icon={Wrench} />
      </div>

      {/* Maintenance reports submitted by technicians/nurses, awaiting Biomed. */}
      {openReports.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-amber-900"><Wrench size={16} /> Machine reports awaiting Biomed ({openReports.length})</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            {openReports.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 text-sm">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900">{r.chairCode}</span>
                  <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{r.maintenanceType || 'Maintenance'}</span>
                  <span className={`ml-2 rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${statusColor[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{(r.status || '').replace('_', ' ')}</span>
                  {r.notes ? <p className="mt-1 text-slate-600">{r.notes}</p> : null}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {fmt(r.clearedAt || r.createdAt)}
                    {r.clearedByName ? ` • reported by ${r.clearedByName}${r.clearedByRole ? ` (${String(r.clearedByRole).replace('_', ' ')})` : ''}` : (r.clearedBy?.name ? ` • reported by ${r.clearedBy.name}` : '')}
                  </p>
                </div>
                <button type="button" onClick={() => resolveReport(r)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Mark handled</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {adding && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">New Station</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Station A" /></Field>
            <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Room"><input className={inputCls} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
            <Field label="Type"><input className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">A station code (CH-xx) is generated automatically.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={createStation} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Add station</button>
          </div>
        </div>
      )}

      {loading ? <p className="py-6 text-center text-slate-400">Loading stations…</p>
        : chairs.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><EmptyState message="No stations yet. Add your first station." /></div>
          : (
            <div className="grid gap-3 lg:grid-cols-2">
              {chairs.map((ch) => {
                const live = liveByChair[String(ch._id)];
                const history = maintByChair[codeOf(ch)] || [];
                const isOpen = expanded === ch._id;
                return (
                  <div key={ch._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button
                        type="button"
                        onClick={() => setMaintFor(maintFor === ch._id ? null : ch._id)}
                        title="Click to maintain this machine"
                        className="flex items-center gap-3 rounded-lg text-left transition hover:opacity-80"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Wrench size={20} /></div>
                        <div>
                          <p className="font-bold text-slate-900">{codeOf(ch)} <span className="ml-1 text-sm font-normal text-slate-400">{ch.name || ch.type || ''}</span></p>
                          <p className="text-xs text-slate-400">
                            {ch.location || 'No location'}
                            {live ? <span className="ml-2 font-semibold text-purple-600">● In treatment: {personName(live.patient)}</span> : null}
                            {' · '}last maint: {fmt(ch.lastMaintenanceAt)}
                          </p>
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusColor[ch.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{(ch.status || '').replace('_', ' ')}</span>
                        <button type="button" onClick={() => { setMaintFor(maintFor === ch._id ? null : ch._id); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">+ Maintenance</button>
                        <button type="button" onClick={() => setExpanded(isOpen ? null : ch._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                      </div>
                    </div>

                    {maintFor === ch._id && (
                      <div className="border-t border-slate-100 bg-emerald-50/40 p-4">
                        <h4 className="mb-3 text-sm font-bold text-slate-700">Record maintenance — {codeOf(ch)}</h4>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="Set status"><select className={inputCls} value={maint.status} onChange={(e) => setMaint({ ...maint, status: e.target.value })}>{['available', 'maintenance', 'cleaning', 'out_of_order'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></Field>
                          <Field label="Type"><select className={inputCls} value={maint.maintenanceType} onChange={(e) => setMaint({ ...maint, maintenanceType: e.target.value })}>{MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                          <Field label="Notes"><input className={inputCls} value={maint.notes} onChange={(e) => setMaint({ ...maint, notes: e.target.value })} /></Field>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {CHECKS.map(([k, lbl]) => (
                            <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={!!maint.checklist[k]} onChange={(e) => setMaint({ ...maint, checklist: { ...maint.checklist, [k]: e.target.checked } })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                              {lbl}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => setMaintFor(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                          <button type="button" onClick={() => recordMaint(ch)} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Record</button>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {CHAIR_STATUS.map((s) => (
                            <button key={s} type="button" onClick={() => setStatus(ch, s)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">{s.replace('_', ' ')}</button>
                          ))}
                        </div>
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Maintenance flow sheet ({history.length})</h4>
                        {history.length === 0 ? <p className="text-sm text-slate-400">No maintenance records yet.</p> : (
                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {history.map((r) => (
                              <div key={r._id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
                                <span className={`mr-2 rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${statusColor[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{(r.status || '').replace('_', ' ')}</span>
                                {r.maintenanceType ? <span className="mr-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">{r.maintenanceType}</span> : null}
                                <span className="text-slate-500">{fmt(r.clearedAt || r.createdAt)}</span>
                                {r.notes ? <span className="ml-2 text-slate-700">— {r.notes}</span> : null}
                                <span className="ml-2 text-xs text-slate-400">
                                  {Object.entries(r.checklist || {}).filter(([, v]) => v).map(([k]) => k).join(', ')}
                                </span>
                                <span className="ml-2 block text-xs text-slate-400">
                                  {(r.clearedByName || r.clearedBy?.name) ? `by ${r.clearedByName || r.clearedBy?.name}` : ''}
                                  {r.resolved ? ` • ✓ handled${r.resolvedByName ? ` (${r.resolvedByName})` : ''}` : ' • awaiting Biomed'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}
