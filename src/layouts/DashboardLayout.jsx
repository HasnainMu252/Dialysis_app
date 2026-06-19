import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Armchair,
  CalendarDays,
  CreditCard,
  BarChart3,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  Users,
  Wrench,
  Bell,
  X,
  ChevronDown,
  UserCircle,
  Search,
} from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api/notificationApi';
import { isReadByUser } from '../utils/format';
import { navForRole } from '../utils/permissions';

const ICONS = {
  home: Home,
  users: Users,
  calendar: CalendarDays,
  chair: Armchair,
  wrench: Wrench,
  activity: Activity,
  stethoscope: Stethoscope,
  chart: BarChart3,
  card: CreditCard,
  bell: Bell,
};

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = useMemo(
    () => navForRole(user?.role).map(([label, to, iconKey]) => [label, to, ICONS[iconKey] || Home]),
    [user?.role]
  );

  useEffect(() => {
    let mounted = true;
    if (!user?._id && !user?.id) return undefined;
    notificationApi.list()
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data || [];
        setUnreadCount(list.filter((item) => !isReadByUser(item, user)).length);
      })
      .catch(() => setUnreadCount(0));
    return () => { mounted = false; };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-900 bg-gradient-to-b from-slate-950 via-slate-950 to-blue-950 text-white shadow-2xl">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 leading-tight">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-lg font-black shadow-lg shadow-blue-900/40">D</div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">Dialysis CRM</h2>
              <p className="text-xs font-medium text-blue-100/80">{ROLE_LABELS[user?.role] || 'Dashboard'} Panel</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map(([label, to, Icon]) => (
          <NavLink key={`${to}-${label}`} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white text-blue-950 shadow-xl shadow-blue-950/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            {({ isActive }) => <><span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-white/10 text-slate-200 group-hover:bg-blue-500 group-hover:text-white'}`}><Icon size={18} /></span><span className="truncate">{label}</span></>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 md:hidden">
        <button onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 transition group-hover:bg-red-500/20 group-hover:text-red-300"><LogOut size={18} /></span>
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_28%,#f8fafc_100%)]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
      {open && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm md:hidden"><div className="h-full max-w-[88vw]">{sidebar}</div></div>}

      <main className="md:ml-72">
        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 px-3 py-3 shadow-sm shadow-slate-200/70 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-2xl bg-blue-600 p-2 text-white shadow-lg shadow-blue-200 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-extrabold text-slate-950">{ROLE_LABELS[user?.role] || 'Dashboard'}</h2>
                <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{user?.email}</p>
              </div>
            </div>

            <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-400 shadow-inner lg:flex">
              <Search size={17} />
              <span className="text-sm">Quick access: patients, schedules, insurance</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => navigate('/notifications')} className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700" aria-label="Notifications">
                <Bell size={19} />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadCount}</span>}
              </button>

              <div className="relative">
                <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-left shadow-lg shadow-slate-200/80 transition hover:border-blue-200 hover:bg-blue-50/40 sm:px-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white shadow-md">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block max-w-40 truncate text-sm font-extrabold text-slate-950">{user?.name || 'User'}</span>
                    <span className="block text-xs font-medium text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</span>
                  </span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {profileOpen && <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
                  <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 text-white">
                    <div className="flex items-center gap-3"><UserCircle className="h-10 w-10" /><div className="min-w-0"><p className="truncate font-extrabold">{user?.name || 'User'}</p><p className="truncate text-xs text-blue-50">{user?.email}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-100">{ROLE_LABELS[user?.role] || user?.role}</p></div></div>
                  </div>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut size={17}/> Logout</button>
                </div>}
              </div>
            </div>
          </div>
        </header>
        <div className="p-3 sm:p-5 md:p-6"><Outlet /></div>
      </main>
    </div>
  );
}
