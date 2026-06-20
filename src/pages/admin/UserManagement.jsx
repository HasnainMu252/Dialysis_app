import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, KeyRound, Trash2, Pencil, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { userApi } from '../../api/userApi';
import { ROLES, ROLE_LABELS } from '../../constants';

const ROLE_OPTIONS = Object.values(ROLES);
const emptyForm = { name: '', email: '', phone: '', role: ROLES.NURSE, password: '' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await userApi.list({ ...(roleFilter ? { role: roleFilter } : {}), ...(search ? { search } : {}) });
      setUsers(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [roleFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', role: u.role, password: '' }); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await userApi.update(editing._id, { name: form.name, email: form.email, phone: form.phone, role: form.role });
        toast.success('User updated');
      } else {
        await userApi.create(form);
        toast.success('User created');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (pwValue.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await userApi.resetPassword(pwUser._id, pwValue);
      toast.success('Password updated');
      setPwUser(null); setPwValue('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete user ${u.name}? This cannot be undone.`)) return;
    try {
      await userApi.remove(u._id);
      toast.success('User deleted');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = useMemo(
    () => users.filter((u) => !search || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );
  const usersPage = usePagedList(filtered, '', []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        subtitle="Create staff accounts, assign roles, edit details and reset passwords."
        action={<button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add User</button>}
      />

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <input className="input md:col-span-2" placeholder="Search name / email / phone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
        <button className="btn-light" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {usersPage.paged.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.phone || '-'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td className="px-4 py-3"><StatusBadge status={u.isActive === false ? 'inactive' : 'active'} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <button className="inline-flex items-center gap-1 font-medium text-blue-600" onClick={() => openEdit(u)}><Pencil size={14} /> Edit</button>
                    <button className="inline-flex items-center gap-1 font-medium text-amber-600" onClick={() => { setPwUser(u); setPwValue(''); }}><KeyRound size={14} /> Password</button>
                    <button className="inline-flex items-center gap-1 font-medium text-red-600" onClick={() => remove(u)}><Trash2 size={14} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && !loading && <EmptyState message="No users found" />}
        <Pagination page={usersPage.page} pageCount={usersPage.pageCount} total={usersPage.total} onPage={usersPage.setPage} label="users" />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{editing ? 'Edit User' : 'Add User'}</h2><button type="button" onClick={() => setShowForm(false)}><X className="text-slate-400" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}</select></div>
              {!editing && <div className="sm:col-span-2"><label className="label">Temporary Password (min 8 chars)</label><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>}
            </div>
            <div className="flex justify-end gap-3"><button type="button" className="btn-light" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
          </form>
        </div>
      )}

      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={resetPassword} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Reset Password</h2><button type="button" onClick={() => setPwUser(null)}><X className="text-slate-400" /></button></div>
            <p className="text-sm text-slate-500">Set a new password for <b>{pwUser.name}</b> ({pwUser.email}).</p>
            <input className="input" type="text" placeholder="New password (min 8 chars)" value={pwValue} onChange={(e) => setPwValue(e.target.value)} minLength={8} required />
            <div className="flex justify-end gap-3"><button type="button" className="btn-light" onClick={() => setPwUser(null)}>Cancel</button><button type="submit" className="btn-primary">Update Password</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
