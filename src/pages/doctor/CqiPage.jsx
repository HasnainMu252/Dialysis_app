import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { doctorApi } from '../../api/doctorApi';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CqiPage() {
  const [rounds, setRounds] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await doctorApi.listCheckups({ month, year });
      const data = res.data?.data || [];
      setRounds(data);
      const d = {};
      data.forEach((r) => { d[r._id] = { patient: r.cqi?.patient || '', social: r.cqi?.social || '', dietitian: r.cqi?.dietitian || '' }; });
      setDrafts(d);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load CQI');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  const pname = (r) => (r.patient ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim() : r.patientMrn);
  const setField = (id, key, val) => setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: val } }));

  const save = async (r) => {
    try {
      await doctorApi.updateCheckup(r._id, { cqi: drafts[r._id] });
      toast.success('CQI saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    }
  };

  const { paged, page, setPage, total, pageCount } = usePagedList(rounds, search, [pname, (r) => r.patientMrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="CQI Tracking" subtitle="Continuous Quality Improvement notes — Patient, Social and Dietitian CQI per monthly round." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div className="md:col-span-2"><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="space-y-3">
        {paged.map((r) => (
          <div key={r._id} className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><b className="text-slate-900">{pname(r)}</b> <span className="text-xs text-slate-500">• Round {r.roundNumber} • {r.patientMrn}</span></div>
              <button className="btn-primary py-1.5 text-xs" onClick={() => save(r)}>Save CQI</button>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div><label className="label">Patient CQI</label><textarea className="input min-h-20" value={drafts[r._id]?.patient || ''} onChange={(e) => setField(r._id, 'patient', e.target.value)} /></div>
              <div><label className="label">Social CQI</label><textarea className="input min-h-20" value={drafts[r._id]?.social || ''} onChange={(e) => setField(r._id, 'social', e.target.value)} /></div>
              <div><label className="label">Dietitian CQI</label><textarea className="input min-h-20" value={drafts[r._id]?.dietitian || ''} onChange={(e) => setField(r._id, 'dietitian', e.target.value)} /></div>
            </div>
          </div>
        ))}
      </div>
      {!rounds.length && !loading && <EmptyState message="No rounds for this month" />}
      <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="rounds" />
    </div>
  );
}
