import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Armchair, CalendarDays, CreditCard, BarChart3, Home,
  Stethoscope, Users, Wrench, Bell,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { navForRole } from '../../utils/permissions';

const ICONS = {
  home: Home, users: Users, calendar: CalendarDays, chair: Armchair, wrench: Wrench,
  activity: Activity, stethoscope: Stethoscope, chart: BarChart3, card: CreditCard, bell: Bell,
};

export default function MenuPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = useMemo(() => navForRole(user?.role), [user?.role]);

  return (
    <div className="space-y-6">
      <PageHeader title="All Pages" subtitle="Every screen available to your role." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, to, iconKey]) => {
          const Icon = ICONS[iconKey] || Home;
          return (
            <button key={`${to}-${label}`} onClick={() => navigate(to)} className="card flex items-center gap-4 p-5 text-left transition hover:border-blue-200 hover:shadow-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200"><Icon size={22} /></span>
              <div>
                <p className="text-base font-extrabold text-slate-900">{label}</p>
                <p className="text-xs font-medium text-slate-500">{to}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
