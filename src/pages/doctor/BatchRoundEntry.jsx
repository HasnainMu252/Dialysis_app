import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import PhysicianRoundForm from '../../components/doctor/PhysicianRoundForm';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { doctorApi } from '../../api/doctorApi';
import { emptyPhysicianRound, ROUND_TEMPLATES } from '../../constants/physicianRound';
import { personName } from '../../utils/format';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Pre-fill with a sensible default template so the doctor only edits what changed.
const buildDefaultForm = () => {
  const tplName = 'Routine Monthly Review';
  const tpl = ROUND_TEMPLATES[tplName];
  const pr = emptyPhysicianRound();
  Object.entries(tpl.physicianRound || {}).forEach(([sk, fields]) => { pr[sk] = { ...pr[sk], ...fields }; });
  pr.laboratoryReview = {}; // Section D is not part of the monthly batch
  return { physicianRound: pr, doctorComments: tpl.doctorComments || '', socialWorkerComments: '', dietitianComments: '', cqi: { patient: '', social: '', dietitian: '' }, templateUsed: tplName };
};

export default function BatchRoundEntry() {
  const [patients, setPatients] = useState([]);
  const [existing, setExisting] = useState([]);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [roundNumber, setRoundNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(buildDefaultForm);

  useEffect(() => {
    doctorApi.patients().then((res) => setPatients(res.data?.data || [])).catch(() => {});
  }, []);

  // load existing rounds for the chosen month so we can hide patients who already have this round
  useEffect(() => {
    doctorApi.listCheckups({ month, year }).then((res) => setExisting(res.data?.data || [])).catch(() => setExisting([]));
  }, [month, year]);

  // patient ids that already have the selected round this month
  const haveRound = useMemo(() => {
    const set = new Set();
    existing.forEach((c) => {
      if (Number(c.roundNumber) === Number(roundNumber)) {
        set.add(c.patient?._id?.toString() || c.patient?.toString());
      }
    });
    return set;
  }, [existing, roundNumber]);

  const visiblePatients = useMemo(
    () => (onlyMissing ? patients.filter((p) => !haveRound.has(p._id)) : patients),
    [patients, haveRound, onlyMissing]
  );

  const { paged, page, setPage, total, pageCount } = usePagedList(visiblePatients, search, [(p) => personName(p), (p) => p.mrn, (p) => p.phone], 16);
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAllPage = () => {
    const allOn = paged.every((p) => selected[p._id]);
    const next = { ...selected };
    paged.forEach((p) => { next[p._id] = !allOn; });
    setSelected(next);
  };

  const apply = async () => {
    if (!selectedIds.length) return toast.error('Select at least one patient');
    setSaving(true);
    try {
      const res = await doctorApi.batchCreate({
        patientIds: selectedIds,
        month: Number(month), year: Number(year), roundNumber: Number(roundNumber),
        physicianRound: form.physicianRound,
        doctorComments: form.doctorComments,
        socialWorkerComments: form.socialWorkerComments,
        dietitianComments: form.dietitianComments,
        cqi: form.cqi,
        templateUsed: form.templateUsed,
      });
      toast.success(res.data?.message || 'Rounds created');
      setSelected({});
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Batch create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Batch Monthly Round" subtitle="Select multiple patients, fill the round once, and apply it to everyone selected." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className="label">Round</label><select className="input" value={roundNumber} onChange={(e) => setRoundNumber(Number(e.target.value))}>{[1, 2, 3, 4].map((r) => <option key={r} value={r}>Round {r}</option>)}</select></div>
        <div className="flex items-end"><span className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700">{selectedIds.length} selected</span></div>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-slate-900">Select Patients</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
              Only missing Round {roundNumber}
            </label>
            <input className="input" placeholder="Search patient" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-light whitespace-nowrap" onClick={toggleAllPage}>Toggle page</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {paged.map((p) => (
            <label key={p._id} className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 transition ${selected[p._id] ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
              <input type="checkbox" checked={!!selected[p._id]} onChange={() => toggle(p._id)} />
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{personName(p)}</p><p className="truncate text-[11px] text-slate-500">{p.mrn}</p></div>
            </label>
          ))}
        </div>
        {!visiblePatients.length && <EmptyState message={onlyMissing ? `All patients already have Round ${roundNumber} this month` : 'No patients found'} />}
        <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="patients" />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-extrabold text-slate-900">Round Details (applied to all selected)</h2>
        <PhysicianRoundForm value={form} onChange={setForm} hiddenSections={['laboratoryReview']} />
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" onClick={apply} disabled={saving}>{saving ? 'Applying…' : `Apply To ${selectedIds.length} Patient(s)`}</button>
        </div>
      </section>
    </div>
  );
}
