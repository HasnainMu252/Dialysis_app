import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DashboardReports from './DashboardReports';
import MedicationReport from './MedicationReport';
import MedicationUsageReport from './MedicationUsageReport';
import IndividualPatientReport from './IndividualPatientReport';

const TABS = [
  { key: 'dialysis', label: 'Dialysis & Rounds' },
  { key: 'medication', label: 'Medication Report' },
  { key: 'usage', label: 'Medication Usage' },
  { key: 'individual', label: 'Individual Patient' },
];

export default function ReportsHub() {
  const [tab, setTab] = useState('dialysis');
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="All reporting in one place — dialysis, doctor rounds and medication, with Excel/CSV export." />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:bg-blue-50'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'dialysis' && <DashboardReports />}
      {tab === 'medication' && <MedicationReport />}
      {tab === 'usage' && <MedicationUsageReport />}
      {tab === 'individual' && <IndividualPatientReport />}
    </div>
  );
}
