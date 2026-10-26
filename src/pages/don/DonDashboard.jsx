import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, Activity } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import CqiReviewPanel from '../../components/common/CqiReviewPanel';

/* Director of Nursing: monthly CQI review + quick links to billing/reports. */
export default function DonDashboard() {
  const [totalPatients, setTotalPatients] = useState(0);

  useEffect(() => {
    patientApi.list({ page: 1, limit: 1 })
      .then((r) => { const b = r.data || {}; setTotalPatients(b.total ?? b.meta?.total ?? 0); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Director of Nursing" subtitle="Monthly CQI oversight, reporting and billing access." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Patients" value={totalPatients} icon={Users} />
        <Link to="/reports"><StatCard title="Reports" value="Open" icon={Activity} /></Link>
        <Link to="/cqi/review"><StatCard title="CQI Review" value="This month" icon={ClipboardList} /></Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Monthly CQI</h2>
        <CqiReviewPanel />
      </div>
    </div>
  );
}
