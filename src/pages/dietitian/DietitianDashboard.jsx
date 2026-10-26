import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, FlaskConical, Apple } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { personName } from '../../utils/format';

/* Dietitian: review labs, patient nutrition context and CQI. Education
 * materials + food-hurdle notes land in Phase C; this is the working hub. */
export default function DietitianDashboard() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    patientApi.list({ page: 1, limit: 25 })
      .then((r) => { const b = r.data || {}; setPatients(b.data || []); setTotal(b.total ?? b.meta?.total ?? (b.data || []).length); })
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load patients'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) => `${personName(p)} ${p.mrn}`.toLowerCase().includes(s));
  }, [patients, q]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dietitian Dashboard" subtitle="Review labs and nutrition context for your patients." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Patients" value={total} icon={Users} />
        <StatCard title="Labs" value="Per patient" icon={FlaskConical} />
        <StatCard title="Nutrition CQI" value="Add per visit" icon={Apple} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or MRN…" className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" />
        {loading ? (
          <p className="py-6 text-center text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState message="No patients found" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{personName(p)}</p>
                  <p className="text-xs text-slate-400">{p.mrn} · {p.medicalHistory?.diagnosis || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/patients/${p.mrn || p._id}?tab=lab%20reports`} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">Review labs →</Link>
                  <Link to={`/patients/${p.mrn || p._id}?tab=nutrition`} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Nutrition & education →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
