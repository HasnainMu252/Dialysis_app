import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import { notificationApi } from '../../api/notificationApi';
import { dateOnly, isReadByUser, personName } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { canForceNotify } from '../../utils/permissions';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forceForm, setForceForm] = useState({ title: 'Test schedule alert', message: 'New dialysis schedule created. Please check today queue.', roles: 'nurse,admin', type: 'general' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.list();
      setItems(res.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      toast.success('Notification marked as read');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to mark notification');
    }
  };

  const sendForce = async () => {
    try {
      await notificationApi.forceSend({
        title: forceForm.title,
        message: forceForm.message,
        type: forceForm.type,
        roles: forceForm.roles.split(',').map((role) => role.trim()).filter(Boolean),
      });
      toast.success('Notification sent');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Notification send failed');
    }
  };

  const sendExpiryTest = async () => {
    try {
      await notificationApi.testInsuranceExpiry({ days: 15 });
      toast.success('15-day expiry test notification created');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Expiry test failed');
    }
  };

  const stats = useMemo(() => {
    const unread = items.filter((item) => !isReadByUser(item, user)).length;
    const expiry = items.filter((item) => item.type === 'insurance_expiry').length;
    return { total: items.length, unread, read: items.length - unread, expiry };
  }, [items, user]);

  if (loading) return <Loading message="Loading notifications..." />;

  return <div className="space-y-5">
    <PageHeader title="Notifications" subtitle="Insurance expiry reminders, insurance approval alerts and general role-based alerts." />
    {canForceNotify(user?.role) && <section className="card space-y-3 p-5"><h2 className="font-bold">Admin Force Notification / Test</h2><div className="grid gap-3 md:grid-cols-4"><input className="input" value={forceForm.title} onChange={(e) => setForceForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" /><input className="input md:col-span-2" value={forceForm.message} onChange={(e) => setForceForm((p) => ({ ...p, message: e.target.value }))} placeholder="Message" /><input className="input" value={forceForm.roles} onChange={(e) => setForceForm((p) => ({ ...p, roles: e.target.value }))} placeholder="roles comma separated" /></div><div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={sendForce}>Send Force Notification</button><button className="btn-light" onClick={sendExpiryTest}>Test 15-Day Insurance Expiry</button></div></section>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Alerts" value={stats.total} icon={Bell} />
      <StatCard title="Unread" value={stats.unread} icon={ShieldAlert} />
      <StatCard title="Read" value={stats.read} icon={CheckCircle2} />
      <StatCard title="Expiry Alerts" value={stats.expiry} icon={Clock} />
    </div>

    {!items.length ? <EmptyState message="No notifications" /> : <div className="space-y-3">
      {items.map((item) => {
        const read = isReadByUser(item, user);
        const due = item.dueDate || item.insuranceForm?.dueDate;
        return <div className={`card p-4 sm:p-5 ${read ? 'bg-white' : 'border-blue-200 bg-blue-50/40'}`} key={item._id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                {!read && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">New</span>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                <span>Patient: <b>{item.patient ? `${personName(item.patient)} ${item.patient.mrn ? `• ${item.patient.mrn}` : ''}` : '-'}</b></span>
                <span>Due: <b>{dateOnly(due)}</b></span>
                <span>Created: <b>{dateOnly(item.createdAt)}</b></span>
                <span>Roles: <b>{(item.roles || []).join(', ') || '-'}</b></span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.type || 'general'} />
              <StatusBadge status={read ? 'read' : 'unread'} />
              {!read && <button className="btn-light" onClick={() => markRead(item._id)}>Mark Read</button>}
            </div>
          </div>
        </div>;
      })}
    </div>}
  </div>;
}
