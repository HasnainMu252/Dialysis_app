import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billingApi';
import { sessionApi } from '../../api/sessionApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { money, personName } from '../../utils/format';

const CAT_LABEL = { dialysis: 'Dialysis', drug: 'Drug', iv: 'IV', radiology: 'Radiology', other: 'Other' };
const CAT_COLOR = {
  dialysis: 'bg-[#123B5D]/10 text-[#123B5D]',
  drug: 'bg-[#087E8B]/10 text-[#087E8B]',
  iv: 'bg-indigo-100 text-indigo-700',
  radiology: 'bg-amber-100 text-amber-800',
  other: 'bg-slate-100 text-slate-600',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Claims() {
  const nowDate = new Date();
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sMonth, setSMonth] = useState(nowDate.getMonth() + 1);
  const [sYear, setSYear] = useState(nowDate.getFullYear());
  const [form, setForm] = useState({ patient: '', session: '', month: new Date().toISOString().slice(0, 7), amount: 25000, status: 'submitted', insuranceProvider: 'ABC Insurance' });
  const { paged, page, setPage, total, pageCount } = usePagedList(items, search, [(c) => c.claimReference, (c) => personName(c.patient), (c) => c.patient?.mrn]);
  const completedSessions = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);

  const load = async () => {
    try { const [claimRes, sessionRes] = await Promise.allSettled([billingApi.listClaims(), sessionApi.list({ status: 'completed' })]); if (claimRes.status === 'fulfilled') setItems(claimRes.value.data?.data || []); if (sessionRes.status === 'fulfilled') setSessions(sessionRes.value.data?.data || []); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to load billing'); }
  };
  useEffect(() => { load(); }, []);

  const loadSummary = async () => {
    try { const res = await billingApi.summary({ month: sMonth, year: sYear }); setSummary(res.data?.data || null); }
    catch { setSummary(null); }
  };
  useEffect(() => { loadSummary(); /* eslint-disable-next-line */ }, [sMonth, sYear]);

  const generate = async () => {
    setGenerating(true);
    try { const res = await billingApi.generateDue(); toast.success(res.data?.message || 'Done'); load(); loadSummary(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const selectSession = (id) => {
    const session = completedSessions.find((s) => s._id === id);
    const patientMrn = session?.patient?.mrn || session?.patient?._id || session?.patient || '';
    setForm({ ...form, session: id, patient: patientMrn });
  };
  const create = async (event) => { event.preventDefault(); if (!form.patient || !form.session) return toast.error('Patient and completed session required'); try { await billingApi.createClaim({ ...form, amount: Number(form.amount) }); toast.success('Claim created'); setForm({ ...form, session: '', patient: '' }); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed to create claim'); } };
  const updateStatus = async (claim, status) => { try { await billingApi.updateClaim(claim.claimReference || claim._id, { status, ...(status === 'paid' ? { paidAt: new Date().toISOString(), paymentAmount: claim.amount } : {}) }); toast.success('Claim updated'); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed to update claim'); } };

  return <div className="space-y-5">
    <PageHeader title="Billing Claims" subtitle="Completed dialysis is billed automatically (procedure + drugs + IVs + radiology). You can also create a claim manually."
      action={<button type="button" className="btn-primary" onClick={generate} disabled={generating}>{generating ? 'Working…' : 'Generate bills'}</button>} />

    {/* USAGE SUMMARY for the biller */}
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-900">Usage summary</h2>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={sMonth} onChange={(e) => setSMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <input className="input w-24" type="number" value={sYear} onChange={(e) => setSYear(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['Dialysis sessions', summary?.dialysisSessions],
          ['Doctor rounds', summary?.doctorRounds],
          ['Medication usage', summary?.medicationUsage],
          ['Dialysis med usage', summary?.dialysisMedicationUsage],
          ['Drugs during dialysis', summary?.drugsDuringDialysisQty],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[#123B5D]">{val ?? '—'}</p>
          </div>
        ))}
      </div>
      {summary?.topDrugs?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#087E8B]">Drugs used during dialysis</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Drug</th><th className="px-3 py-2">Doses given</th><th className="px-3 py-2">Total quantity</th></tr></thead>
              <tbody className="divide-y">
                {summary.topDrugs.map((d) => (
                  <tr key={d.name}><td className="px-3 py-2 font-semibold text-slate-800">{d.name}</td><td className="px-3 py-2 text-slate-600">{d.doses}</td><td className="px-3 py-2 text-slate-600">{d.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>

    <form onSubmit={create} className="card grid gap-4 p-5 md:grid-cols-6"><div className="md:col-span-2"><label className="label">Completed Session</label><select className="input" value={form.session} onChange={(e) => selectSession(e.target.value)}><option value="">Select completed session</option>{completedSessions.map((s) => <option key={s._id} value={s._id}>{personName(s.patient)} • {s._id}</option>)}</select></div><div><label className="label">Patient MRN / ID</label><input className="input" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} /></div><div><label className="label">Month</label><input className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div><div><label className="label">Amount</label><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div><div><label className="label">Provider</label><input className="input" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} /></div><button className="btn-primary md:col-span-6">Create Claim</button></form>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{['pending','submitted','paid','denied','partial'].map((s) => <div className="card p-4" key={s}><p className="text-xs uppercase text-slate-500">{s}</p><p className="text-2xl font-bold">{items.filter((i) => i.status === s).length}</p></div>)}</div>

    <div className="card p-3"><input className="input" placeholder="Search reference, patient or MRN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <div className="card overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Reference</th><th>Patient</th><th>Services</th><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {paged.map((claim) => {
        const open = openId === claim._id;
        const items = claim.lineItems || [];
        return [
          <tr className="border-b last:border-0" key={claim._id}>
            <td className="p-3 font-semibold">{claim.claimReference}{claim.autoGenerated && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">AUTO</span>}</td>
            <td>{personName(claim.patient)}<br/><span className="text-xs text-slate-500">{claim.patient?.mrn}</span></td>
            <td>{items.length ? <button type="button" className="font-semibold text-[#123B5D] hover:underline" onClick={() => setOpenId(open ? null : claim._id)}>{items.length} line{items.length === 1 ? '' : 's'} {open ? '▲' : '▼'}</button> : <span className="text-slate-400">—</span>}</td>
            <td>{claim.month}</td>
            <td>{money(claim.amount)}</td>
            <td><StatusBadge status={claim.status} /></td>
            <td className="space-x-2 whitespace-nowrap"><button className="text-blue-600" onClick={() => updateStatus(claim, 'submitted')}>Submit</button><button className="text-green-600" onClick={() => updateStatus(claim, 'paid')}>Paid</button><button className="text-red-600" onClick={() => updateStatus(claim, 'denied')}>Deny</button></td>
          </tr>,
          open && (
            <tr key={`${claim._id}-d`} className="border-b bg-slate-50/60">
              <td colSpan="7" className="p-3">
                <div className="space-y-1">
                  {items.map((l, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded px-1.5 py-0.5 font-bold ${CAT_COLOR[l.category] || CAT_COLOR.other}`}>{CAT_LABEL[l.category] || l.category}</span>
                      <span className="font-mono font-semibold text-slate-700">{l.code}</span>
                      <span className="text-slate-700">{l.description}</span>
                      {l.quantity > 1 && <span className="text-slate-400">×{l.quantity}</span>}
                      <span className="ml-auto font-semibold text-slate-600">{money(l.amount)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-slate-400">Codes are standard CPT/HCPCS; placeholder fees — set your contracted rates per line/claim.</p>
                </div>
              </td>
            </tr>
          ),
        ];
      })}
      {items.length === 0 && <tr><td colSpan="7"><EmptyState message="No claims found" /></td></tr>}
    </tbody></table><div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="claims" /></div></div>
  </div>;
}
