import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { chairApi } from '../../api/chairApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { CHAIR_STATUS, ROLES } from '../../constants';
import { chairCodeOf } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function ChairList() {
  const { user } = useAuth();
  const canCreate = [ROLES.ADMIN, ROLES.FRONT_DESK].includes(user?.role);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ chairNumber: '', code: '', name: '', location: 'Dialysis Room A', status: 'available' });
  const [loading, setLoading] = useState(false);
  const load = async () => { try { const res = await chairApi.list(); setItems(res.data?.data || []); } catch (error) { toast.error(error?.response?.data?.message || 'Failed to load chairs'); } };
  useEffect(() => { load(); }, []);
  const create = async (event) => { event.preventDefault(); if (!form.chairNumber) return toast.error('Chair number is required'); setLoading(true); try { await chairApi.create({ ...form, code: form.code || form.chairNumber, name: form.name || form.chairNumber }); toast.success('Chair created'); setForm({ chairNumber: '', code: '', name: '', location: 'Dialysis Room A', status: 'available' }); load(); } catch (error) { toast.error(error?.response?.data?.message || 'Failed to create chair'); } finally { setLoading(false); } };
  const update = async (chair, status) => { try { await chairApi.updateStatus(chairCodeOf(chair) || chair._id, { status, conditionNotes: `Marked ${status}` }); toast.success('Chair updated'); load(); } catch (error) { toast.error(error?.response?.data?.message || 'Failed to update chair'); } };
  const count = (status) => items.filter((x) => x.status === status).length;
  return <div className="space-y-5"><PageHeader title="Chair Status" subtitle={canCreate ? 'Admin/front desk can create chairs. Clinical teams update operational status only.' : 'View and update operational chair status. Chair creation is admin/front desk only.'} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{CHAIR_STATUS.map((s) => <div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{count(s)}</p></div>)}</div>
    {canCreate && <form onSubmit={create} className="card grid gap-4 p-5 md:grid-cols-6"><div><label className="label">Chair Number</label><input className="input" value={form.chairNumber} onChange={(e) => setForm({ ...form, chairNumber: e.target.value, code: e.target.value, name: e.target.value })} placeholder="CH-12" /></div><div><label className="label">Code</label><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div><div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div><div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{CHAIR_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div><div className="flex items-end"><button disabled={loading} className="btn-primary w-full">Create</button></div></form>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((chair) => <div className="card p-4" key={chair._id}><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-bold">{chairCodeOf(chair)}</div><p className="text-sm text-slate-500">{chair.location || 'No location'}</p><p className="text-xs text-slate-400">{chair.conditionNotes}</p></div><StatusBadge status={chair.status} /></div><div className="mt-4 grid grid-cols-2 gap-2">{['available','reserved','cleaning','maintenance','out_of_order'].map((s) => <button key={s} className="btn-light text-xs" onClick={() => update(chair, s)}>{s}</button>)}</div></div>)}</div>{!items.length && <EmptyState message="No chairs found" />}</div>;
}
