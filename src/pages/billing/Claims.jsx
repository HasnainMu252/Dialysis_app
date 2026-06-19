import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billingApi';
import { sessionApi } from '../../api/sessionApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { money, personName } from '../../utils/format';

export default function Claims() {
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ patient: '', session: '', month: new Date().toISOString().slice(0, 7), amount: 25000, status: 'submitted', insuranceProvider: 'ABC Insurance' });
  const completedSessions = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);

  const load = async () => {
    try { const [claimRes, sessionRes] = await Promise.allSettled([billingApi.listClaims(), sessionApi.list({ status: 'completed' })]); if (claimRes.status === 'fulfilled') setItems(claimRes.value.data?.data || []); if (sessionRes.status === 'fulfilled') setSessions(sessionRes.value.data?.data || []); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to load billing'); }
  };
  useEffect(() => { load(); }, []);

  const selectSession = (id) => {
    const session = completedSessions.find((s) => s._id === id);
    const patientMrn = session?.patient?.mrn || session?.patient?._id || session?.patient || '';
    setForm({ ...form, session: id, patient: patientMrn });
  };
  const create = async (event) => { event.preventDefault(); if (!form.patient || !form.session) return toast.error('Patient and completed session required'); try { await billingApi.createClaim({ ...form, amount: Number(form.amount) }); toast.success('Claim created'); setForm({ ...form, session: '', patient: '' }); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed to create claim'); } };
  const updateStatus = async (claim, status) => { try { await billingApi.updateClaim(claim.claimReference || claim._id, { status, ...(status === 'paid' ? { paidAt: new Date().toISOString(), paymentAmount: claim.amount } : {}) }); toast.success('Claim updated'); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed to update claim'); } };

  return <div className="space-y-5"><PageHeader title="Billing Claims" subtitle="Create one claim per completed session and update payment status." />
    <form onSubmit={create} className="card grid gap-4 p-5 md:grid-cols-6"><div className="md:col-span-2"><label className="label">Completed Session</label><select className="input" value={form.session} onChange={(e) => selectSession(e.target.value)}><option value="">Select completed session</option>{completedSessions.map((s) => <option key={s._id} value={s._id}>{personName(s.patient)} • {s._id}</option>)}</select></div><div><label className="label">Patient MRN / ID</label><input className="input" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} /></div><div><label className="label">Month</label><input className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div><div><label className="label">Amount</label><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div><div><label className="label">Provider</label><input className="input" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} /></div><button className="btn-primary md:col-span-6">Create Claim</button></form>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{['pending','submitted','paid','denied','partial'].map((s) => <div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{items.filter((i) => i.status === s).length}</p></div>)}</div>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Reference</th><th>Patient</th><th>Session</th><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map((claim) => <tr className="border-b last:border-0" key={claim._id}><td className="p-3 font-semibold">{claim.claimReference}</td><td>{personName(claim.patient)}<br/><span className="text-xs text-slate-500">{claim.patient?.mrn}</span></td><td className="max-w-[150px] truncate">{claim.session?._id || claim.session}</td><td>{claim.month}</td><td>{money(claim.amount)}</td><td><StatusBadge status={claim.status} /></td><td className="space-x-2 whitespace-nowrap"><button className="text-blue-600" onClick={() => updateStatus(claim, 'submitted')}>Submit</button><button className="text-green-600" onClick={() => updateStatus(claim, 'paid')}>Paid</button><button className="text-red-600" onClick={() => updateStatus(claim, 'denied')}>Deny</button></td></tr>)}{items.length === 0 && <tr><td colSpan="7"><EmptyState message="No claims found" /></td></tr>}</tbody></table></div>
  </div>;
}
