import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import RoundDetailModal from '../../components/doctor/RoundDetailModal';
import { doctorApi } from '../../api/doctorApi';
import api from '../../api/axios';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pname = (r) => (r.patient ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim() : r.patientMrn);

export default function PhysicianBilling() {
  const [rounds, setRounds] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [approval, setApproval] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewPatient, setViewPatient] = useState(null); // grouped patient
  const [viewRound, setViewRound] = useState(null);      // single round detail

  const exportReport = async (fmt) => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/soap/monthly', { params: { month, year, format: fmt }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `physician-rounds-${year}-${String(month).padStart(2, '0')}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Export failed');
    } finally { setDownloading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (approval) params.approval = approval;
      const res = await doctorApi.listCheckups(params);
      setRounds(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load rounds');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, approval]);

  const setStatus = async (r, status) => {
    try {
      await doctorApi.updateApproval(r._id, status);
      toast.success(`Round ${status}`);
      const updated = { ...r, approval: { ...(r.approval || {}), status } };
      setRounds((prev) => prev.map((x) => (x._id === r._id ? updated : x)));
      setViewPatient((vp) => (vp ? { ...vp, rounds: vp.rounds.map((x) => (x._id === r._id ? updated : x)) } : vp));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  // group by patient — one row each
  const grouped = useMemo(() => {
    const map = new Map();
    rounds.forEach((r) => {
      const key = r.patient?._id || r.patientMrn;
      if (!map.has(key)) map.set(key, { name: pname(r), mrn: r.patientMrn, doctor: r.doctor?.name || r.doctor?.email || '-', rounds: [] });
      map.get(key).rounds.push(r);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      roundNumbers: g.rounds.map((x) => x.roundNumber).sort((a, b) => a - b),
      approved: g.rounds.filter((x) => x.approval?.status === 'approved').length,
      pending: g.rounds.filter((x) => (x.approval?.status || 'pending') === 'pending').length,
    }));
  }, [rounds]);

  const { paged, page, setPage, total, pageCount } = usePagedList(grouped, search, [(g) => g.name, (g) => g.mrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="Physician Billing" subtitle="One row per patient. Click View to review and approve each round." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className="label">Approval</label><select className="input" value={approval} onChange={(e) => setApproval(e.target.value)}><option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
        <div><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary inline-flex items-center gap-2" onClick={() => exportReport('xlsx')} disabled={downloading}><Download size={16} /> Export Excel (comments + CQI)</button>
        <button className="btn-light inline-flex items-center gap-2" onClick={() => exportReport('csv')} disabled={downloading}><Download size={16} /> Export CSV</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Rounds</th><th className="px-4 py-3">Approved</th><th className="px-4 py-3">Pending</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((g) => (
              <tr key={g.mrn} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{g.name}<div className="text-xs font-normal text-slate-500">{g.mrn}</div></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{g.doctor}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{g.roundNumbers.map((n) => `R${n}`).join(', ')}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-green-700">{g.approved}</td>
                <td className="whitespace-nowrap px-4 py-3 text-amber-700">{g.pending}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right"><button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100" onClick={() => setViewPatient(g)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!grouped.length && !loading && <EmptyState message="No physician rounds for this period" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="patients" /></div>
      </div>

      {viewPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setViewPatient(null)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div><h3 className="text-lg font-extrabold text-slate-900">{viewPatient.name}</h3><p className="text-xs text-slate-500">{viewPatient.mrn} · {viewPatient.rounds.length} round(s)</p></div>
              <button onClick={() => setViewPatient(null)}><X className="text-slate-400" /></button>
            </div>
            <div className="space-y-2 p-4">
              {viewPatient.rounds.sort((a, b) => a.roundNumber - b.roundNumber).map((r) => (
                <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3">
                  <div><b className="text-slate-900">Round {r.roundNumber}</b> <StatusBadge status={r.approval?.status || 'pending'} /></div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100" onClick={() => setViewRound(r)}>Detail</button>
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700" onClick={() => setStatus(r, 'approved')}>Approve</button>
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700" onClick={() => setStatus(r, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewRound && <RoundDetailModal round={viewRound} onClose={() => setViewRound(null)} />}
    </div>
  );
}
