import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { doctorApi } from '../../api/doctorApi';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PhysicianBilling() {
  const [rounds, setRounds] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [approval, setApproval] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (approval) params.approval = approval;
      const res = await doctorApi.listCheckups(params);
      setRounds(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, approval]);

  const setStatus = async (r, status) => {
    try {
      await doctorApi.updateApproval(r._id, status);
      toast.success(`Round ${status}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const pname = (r) => (r.patient ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim() : r.patientMrn);
  const { paged, page, setPage, total, pageCount } = usePagedList(rounds, search, [pname, (r) => r.patientMrn]);

  return (
    <div className="space-y-5">
      <PageHeader title="Physician Billing" subtitle="Doctor monthly rounds prepared for submission to the CKS office. Review and approve each round." />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className="label">Approval</label><select className="input" value={approval} onChange={(e) => setApproval(e.target.value)}><option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
        <div><label className="label">Search</label><input className="input" placeholder="Patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Month</th><th className="px-4 py-3">Round</th><th className="px-4 py-3">Approval</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{pname(r)}<div className="text-xs font-normal text-slate-500">{r.patientMrn}</div></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.doctor?.name || r.doctor?.email || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.month}/{r.year}</td>
                <td className="whitespace-nowrap px-4 py-3">Round {r.roundNumber}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={r.approval?.status || 'pending'} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.createdAt?.slice(0, 10)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700" onClick={() => setStatus(r, 'approved')}>Approve</button>
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700" onClick={() => setStatus(r, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rounds.length && !loading && <EmptyState message="No physician rounds for this period" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="rounds" /></div>
      </div>
    </div>
  );
}
