import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Search, Stethoscope, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import StatCard from '../../components/ui/StatCard';
import { doctorApi } from '../../api/doctorApi';
import { personName } from '../../utils/format';

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const getCompletedRounds = (checkups = [], patientId, month, year) => {
  const ids = new Set();
  checkups
    .filter((item) => String(item?.patient?._id || item?.patient) === String(patientId))
    .filter((item) => Number(item.month) === Number(month) && Number(item.year) === Number(year) && item.status === 'completed')
    .forEach((item) => ids.add(Number(item.roundNumber)));
  return [...ids].sort((a, b) => a - b);
};

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const load = async () => {
    setLoading(true);
    try {
      const res = await doctorApi.patients();
      const patientList = res.data?.data || [];
      setPatients(patientList);

      const detailResults = await Promise.allSettled(
        patientList.map((patient) => doctorApi.patientDetail(patient._id))
      );

      const nextDetails = {};
      detailResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          nextDetails[patientList[index]._id] = result.value.data?.data || {};
        }
      });
      setDetails(nextDetails);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load doctor dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => patients.map((patient) => {
    const doctorCheckups = details[patient._id]?.doctorCheckups || [];
    const completedRounds = getCompletedRounds(doctorCheckups, patient._id, month, year);
    const missingRounds = [1, 2, 3, 4].filter((round) => !completedRounds.includes(round));
    return { patient, completedRounds, missingRounds, completedCount: completedRounds.length };
  }), [patients, details, month, year]);

  const filteredRows = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return rows;
    return rows.filter(({ patient }) => [patient.mrn, patient.firstName, patient.lastName, patient.phone, patient.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(value));
  }, [rows, search]);

  const roundStats = useMemo(() => ({
    zero: rows.filter((row) => row.completedCount === 0).length,
    one: rows.filter((row) => row.completedCount === 1).length,
    two: rows.filter((row) => row.completedCount === 2).length,
    three: rows.filter((row) => row.completedCount === 3).length,
    four: rows.filter((row) => row.completedCount >= 4).length,
  }), [rows]);

  const pendingRows = filteredRows.filter((row) => row.completedCount < 4);
  const pendingPage = usePagedList(pendingRows, '', []);
  const allPage = usePagedList(filteredRows, '', []);

  if (loading) return <Loading label="Loading doctor dashboard..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Dashboard"
        subtitle="Monthly SOAP rounds, pending checkups and patient clinical history."
        action={<button className="btn-light" onClick={load}>Refresh</button>}
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Active Patients" value={patients.length} icon={Users} />
        <StatCard title="0/4 Rounds" value={roundStats.zero} icon={AlertTriangle} />
        <StatCard title="1/4 Round" value={roundStats.one} icon={ClipboardList} />
        <StatCard title="2/4 Rounds" value={roundStats.two} icon={Activity} />
        <StatCard title="3/4 Rounds" value={roundStats.three} icon={Stethoscope} />
        <StatCard title="4/4 Complete" value={roundStats.four} icon={CheckCircle2} />
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="label">Search Patient</label>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <Search size={18} className="text-slate-400" />
            <input className="w-full outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, MRN, phone or email" />
          </div>
        </div>
        <div>
          <label className="label">Month</label>
          <input className="input" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="label">Year</label>
          <input className="input" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-extrabold text-slate-900">Patients With Pending Monthly Rounds</h2>
          <p className="text-sm text-slate-500">Open a patient to add SOAP notes and upload clinical documents.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3">Patient</th><th className="p-3">MRN</th><th className="p-3">Phone</th><th className="p-3">Completed</th><th className="p-3">Missing</th><th className="p-3 text-right">Action</th></tr>
            </thead>
            <tbody>
              {pendingPage.paged.map(({ patient, completedRounds, missingRounds }) => (
                <tr key={patient._id} className="border-t border-slate-100 align-middle">
                  <td className="whitespace-nowrap p-3 font-bold text-slate-900">{personName(patient)}</td>
                  <td className="whitespace-nowrap p-3 text-slate-600">{patient.mrn || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-slate-600">{patient.phone || '-'}</td>
                  <td className="whitespace-nowrap p-3"><span className="rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-blue-700">{completedRounds.length}/4</span></td>
                  <td className="whitespace-nowrap p-3"><span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Round {missingRounds.join(', ')}</span></td>
                  <td className="whitespace-nowrap p-3 text-right"><Link className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700" to={`/doctor/patients/${patient._id}?tab=doctor%20rounds&addRound=1`}>Open / Add SOAP</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3"><Pagination page={pendingPage.page} pageCount={pendingPage.pageCount} total={pendingPage.total} onPage={pendingPage.setPage} label="pending patients" /></div>
        {!pendingRows.length && <div className="p-4"><EmptyState message="All patients completed 4/4 rounds for selected month." /></div>}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-extrabold text-slate-900">All Doctor Patient List</h2>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {allPage.paged.map(({ patient, completedRounds, missingRounds }) => (
            <Link key={patient._id} to={`/doctor/patients/${patient._id}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-black text-slate-900">{personName(patient)}</h3><p className="text-xs font-bold text-slate-500">{patient.mrn || 'No MRN'} • {patient.phone || 'No phone'}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${completedRounds.length >= 4 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{completedRounds.length}/4</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Diagnosis: {patient.medicalHistory?.diagnosis || 'Not added'}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Missing: {missingRounds.length ? `Round ${missingRounds.join(', ')}` : 'None'}</p>
            </Link>
          ))}
        </div>
        <div className="px-4 pb-4"><Pagination page={allPage.page} pageCount={allPage.pageCount} total={allPage.total} onPage={allPage.setPage} label="patients" /></div>
      </section>
    </div>
  );
}
