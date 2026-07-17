import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, X, FileEdit, Eye } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import Pagination, { usePagedList } from './Pagination';
import PatientJourneyPanel from './PatientJourneyPanel';
import Portal from './Portal';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from './EmptyState';
import { personName } from '../../utils/format';

/**
 * A scalable patient board that stays clean at 20, 200 or 2000 patients:
 * search + responsive wrapping grid + pagination (no overlapping/jumbled cards).
 * "View more" opens the patient's full bio data. From there staff can open the
 * full editable profile (documents + forms).
 */
export default function PatientBoard({ detailBase = '/patients', pageSize = 12 }) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, sc, se] = await Promise.allSettled([
        patientApi.list({ limit: 2000 }),
        scheduleApi.list(),
        sessionApi.list(),
      ]);
      if (p.status === 'fulfilled') setPatients(p.value.data?.data || p.value.data?.patients || []);
      if (sc.status === 'fulfilled') setSchedules(sc.value.data?.schedules || sc.value.data?.data || []);
      if (se.status === 'fulfilled') setSessions(se.value.data?.data || []);
      setLoading(false);
    })();
  }, []);

  const latestStatusFor = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => {
      const pid = s.patient?._id || s.patient;
      if (pid && !map.has(pid)) map.set(pid, s.status); // sessions are newest-first
    });
    return map;
  }, [sessions]);

  const nameField = (p) => personName(p);
  const { paged, page, setPage, total, pageCount } = usePagedList(
    patients, search, [nameField, 'mrn', 'phone'], pageSize
  );

  const patientSchedules = (p) => schedules.filter((s) => s.patientMrn === p?.mrn);
  const patientSessions = (p) => sessions.filter((s) => (s.patient?._id || s.patient) === p?._id || s.patient?.mrn === p?.mrn);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Patients</h2>
          <p className="text-sm text-slate-500">Search, then tap “View more” for full bio data, documents and forms.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, MRN or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading patients…</p>
      ) : !total ? (
        <EmptyState message="No patients match your search." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paged.map((p) => {
              const status = latestStatusFor.get(p._id);
              return (
                <div key={p._id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <b className="truncate text-slate-900">{personName(p)}</b>
                      {status && <StatusBadge status={status} />}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{p.mrn}</p>
                    <p className="truncate text-xs text-slate-500">{p.phone || 'No phone'}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-light inline-flex flex-1 items-center justify-center gap-1 text-xs" onClick={() => setSelected(p)}><Eye size={14} /> View more</button>
                    <button className="btn-primary inline-flex items-center justify-center gap-1 px-2.5 text-xs" onClick={() => navigate(`${detailBase}/${p._id}`)} title="Open full profile / edit"><FileEdit size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} label="patients" />
        </>
      )}

      {selected && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4" onClick={() => setSelected(null)}>
            <div className="my-6 w-full max-w-4xl rounded-3xl bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b bg-white px-5 py-4">
                <h3 className="text-lg font-extrabold">{personName(selected)} — Bio Data</h3>
                <div className="flex items-center gap-2">
                  <button className="btn-primary inline-flex items-center gap-1 text-sm" onClick={() => navigate(`${detailBase}/${selected._id}`)}><FileEdit size={15} /> Open full profile (edit / documents)</button>
                  <button onClick={() => setSelected(null)}><X className="text-slate-400" /></button>
                </div>
              </div>
              <div className="p-5">
                <PatientJourneyPanel patient={selected} schedules={patientSchedules(selected)} sessions={patientSessions(selected)} />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </section>
  );
}
