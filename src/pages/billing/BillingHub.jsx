import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import PhysicianBilling from '../biller/PhysicianBilling';
import DialysisBilling from '../biller/DialysisBilling';
import MedicationBilling from '../biller/MedicationBilling';
import BillingActivity from './BillingActivity';

/*
 * One billing umbrella. The three streams (physician / dialysis / medication)
 * plus the cross-stream activity view live here as tabs instead of separate
 * menu items.
 */
const TABS = [
  { id: 'physician', label: 'Physician' },
  { id: 'dialysis', label: 'Dialysis' },
  { id: 'medication', label: 'Medication' },
  { id: 'activity', label: 'Activity' },
];

export default function BillingHub() {
  const [params, setParams] = useSearchParams();
  const initial = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'physician';
  const [tab, setTab] = useState(initial);

  const select = (id) => {
    setTab(id);
    setParams({ tab: id }, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Physician, dialysis and medication billing — one place." />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.id ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-blue-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'physician' && <PhysicianBilling />}
      {tab === 'dialysis' && <DialysisBilling />}
      {tab === 'medication' && <MedicationBilling />}
      {tab === 'activity' && <BillingActivity />}
    </div>
  );
}
