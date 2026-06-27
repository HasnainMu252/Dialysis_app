import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import PhysicianRoundForm from '../../components/doctor/PhysicianRoundForm';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { doctorApi } from '../../api/doctorApi';
import { emptyPhysicianRound } from '../../constants/physicianRound';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BatchRoundEdit() {
  const [rounds, setRounds] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [roundNumber, setRoundNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ physicianRound: emptyPhysicianRound(), doctorComments: '', socialWorkerComments: '', dietitianComments: '', cqi: {}, templateUsed: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (roundNumber) params.roundNumber = roundNumber;
      const res = await doctorApi.listCheckups(params);
      setRounds(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, roundNumber]);

  const pname = (r) => (r.patient ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim() : r.patientMrn);
  const { paged, page, setPage, total, pageCount } = usePagedList(rounds, search, [pname, (r) => r.patientMrn]);
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const apply = async () => {
    if (!selectedIds.length) return toast.error('Select at least one round');
    setSaving(true);
    try {
      // only send sections/fields the doctor actually changed (non-empty)
      const updates = {
        physicianRound: form.physicianRound,
        doctorComments: form.doctorComments,
        socialWorkerComments: form.socialWorkerComments,
        dietitianComments: form.dietitianComments,
        cqi: form.cqi,
      };
      const res = await doctorApi.batchUpdate({ ids: selectedIds, updates });
      toast.success(res.data?.message || 'Rounds updated');
      setSelected({});
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Batch edit failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Batch Edit Rounds" subtitle="Select existing rounds and apply the same updates (CKD, Anemia, Blood Pressure, CQI, Doctor Comments) to all of them." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className="label">Round</label><select className="input" value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)}><option value="">All</option>{[1, 2, 3, 4].map((r) => <option key={r} value={r}>Round {r}</option>)}</select></div>
        <div className="flex items-end"><span className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700">{selectedIds.length} selected</span></div>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-slate-900">Existing Rounds</h2>
          <input className="input max-w-xs" placeholder="Search patient" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((r) => (
            <label key={r._id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${selected[r._id] ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
              <input type="checkbox" checked={!!selected[r._id]} onChange={() => toggle(r._id)} />
              <div className="min-w-0"><p className="truncate font-bold text-slate-900">{pname(r)} — Round {r.roundNumber}</p><p className="truncate text-xs text-slate-500">{r.patientMrn} • {r.approval?.status || 'pending'}</p></div>
            </label>
          ))}
        </div>
        {!rounds.length && !loading && <EmptyState message="No rounds found for this filter" />}
        <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="rounds" />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-extrabold text-slate-900">Updates (applied to all selected rounds)</h2>
        <PhysicianRoundForm value={form} onChange={setForm} />
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" onClick={apply} disabled={saving}>{saving ? 'Applying…' : `Apply To ${selectedIds.length} Round(s)`}</button>
        </div>
      </section>
    </div>
  );
}
