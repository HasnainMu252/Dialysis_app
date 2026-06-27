import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Armchair, CalendarDays, CreditCard, BarChart3, Home, LogOut,
  Menu, Stethoscope, Users, Wrench, Bell, ChevronDown, UserCircle, X,
} from 'lucide-react';
import { ROLE_LABELS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api/notificationApi';
import { isReadByUser } from '../utils/format';
import { navForRole } from '../utils/permissions';
import Azuza from '../assets/Azuza.png'
import Aegle from '../assets/Aegle.png'
const ICONS = {
  home: Home, users: Users, calendar: CalendarDays, chair: Armchair, wrench: Wrench,
  activity: Activity, stethoscope: Stethoscope, chart: BarChart3, card: CreditCard, bell: Bell,
};

const fmtTime = (d) => { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch { return ''; } };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const headerRef = useRef(null);

  const navItems = useMemo(
    () => navForRole(user?.role).map(([label, to, iconKey]) => [label, to, ICONS[iconKey] || Home]),
    [user?.role]
  );

  const loadNotifications = () => {
    notificationApi.list().then((res) => setNotifications(res.data?.data || [])).catch(() => setNotifications([]));
  };

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    loadNotifications();
  }, [user]);

  // close mobile drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // click-outside closes header popups
  useEffect(() => {
    const onClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setNotifOpen(false); setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = notifications.filter((n) => !isReadByUser(n, user));
  const recent = notifications.slice(0, 6);
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const openNotif = (n) => {
    if (!isReadByUser(n, user)) notificationApi.markRead(n._id || n.id).then(loadNotifications).catch(() => {});
    setNotifOpen(false);
    navigate('/notifications');
  };

  const SidebarInner = (
    <aside className="flex h-full w-72 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-blue-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3 leading-tight">
          <div>
            <img src={Azuza}/>
          </div>
        </div>
        <button className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map(([label, to, Icon]) => (
          <NavLink key={`${to}-${label}`} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white text-blue-950 shadow-xl shadow-blue-950/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            {({ isActive }) => (<>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-white/10 text-slate-200 group-hover:bg-blue-500 group-hover:text-white'}`}><Icon size={18} /></span>
              <span className="truncate">{label}</span>
            </>)}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
                  <img src={Aegle}/>

        <button onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 transition group-hover:bg-red-500/20 group-hover:text-red-300"><LogOut size={18} /></span>
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_28%,#f8fafc_100%)]">
      {/* Desktop fixed sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:shadow-2xl">{SidebarInner}</div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 max-w-[86vw] animate-[slideIn_.2s_ease-out] shadow-2xl">{SidebarInner}</div>
        </div>
      )}

      <div className="lg:ml-72">
        <header ref={headerRef} className="sticky top-0 z-20 border-b border-white/60 bg-white/85 px-3 py-3 shadow-sm shadow-slate-200/70 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200 lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold text-slate-950 sm:text-lg">{ROLE_LABELS[user?.role] || 'Dashboard'}</h2>
                <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification bell popup */}
              <div className="relative">
                <button onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }} className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700" aria-label="Notifications">
                  <Bell size={19} />
                  {unread.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unread.length}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(20rem,90vw)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
                    <div className="flex items-center justify-between border-b px-4 py-3"><span className="text-sm font-extrabold text-slate-900">Notifications</span>{unread.length > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{unread.length} new</span>}</div>
                    <div className="max-h-80 divide-y overflow-y-auto">
                      {recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>}
                      {recent.map((n) => (
                        <button key={n._id || n.id} onClick={() => openNotif(n)} className={`block w-full px-4 py-3 text-left transition hover:bg-blue-50 ${isReadByUser(n, user) ? '' : 'bg-blue-50/40'}`}>
                          <p className="truncate text-sm font-bold text-slate-800">{n.title || n.type || 'Notification'}</p>
                          <p className="line-clamp-2 text-xs text-slate-500">{n.message || n.body || ''}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400">{fmtTime(n.createdAt)}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setNotifOpen(false); navigate('/notifications'); }} className="w-full border-t bg-slate-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">More — view all notifications</button>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 sm:px-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block max-w-32 truncate text-sm font-extrabold text-slate-950">{user?.name || 'User'}</span>
                    <span className="block text-xs font-medium text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</span>
                  </span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-[min(18rem,90vw)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 text-white">
                      <div className="flex items-center gap-3"><UserCircle className="h-10 w-10" /><div className="min-w-0"><p className="truncate font-extrabold">{user?.name || 'User'}</p><p className="truncate text-xs text-blue-50">{user?.email}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-100">{ROLE_LABELS[user?.role] || user?.role}</p></div></div>
                    </div>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut size={17} /> Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-5 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
