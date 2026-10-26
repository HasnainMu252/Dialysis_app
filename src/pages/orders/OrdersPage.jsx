import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pin, Trash2, X, Stethoscope, Home, MessageSquare, Pencil } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { orderApi, ORDER_CATEGORIES, ORDER_TYPES } from '../../api/orderApi';
import { patientApi } from '../../api/patientApi';
import { useAuth } from '../../context/AuthContext';
import { dateOnly, personName } from '../../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

const TYPE_COLOR = {
  nurse: 'bg-[#087E8B]/10 text-[#087E8B]',
  pharmacy: 'bg-[#123B5D]/10 text-[#123B5D]',
  radiology: 'bg-amber-100 text-amber-800',
};
const STATUS_COLOR = {
  ordered: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-800',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const blankForm = () => ({
  orderType: 'nurse',
  category: 'medication',
  patient: '',
  patientName: '',
  name: '',
  details: '',
  instruction: '',
  homeInstruction: '',
  quantity: 1,
  standing: false,
  orderDate: new Date().toISOString().slice(0, 10),
});

/* One order row. Nurses can edit and complete (with a comment); doctor/admin
   can edit, cancel and delete (completion is the nurse's job). */
function OrderRow({ o, canManage, isNurse, onStatus, onComplete, onRemove, onEdit }) {
  const [completing, setCompleting] = useState(false);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: o.name, instruction: o.instruction || '', homeInstruction: o.homeInstruction || '', details: o.details || '', quantity: o.quantity || 1 });
  const typeLabel = (ORDER_TYPES.find((t) => t.value === o.orderType) || {}).label || o.orderType || 'Nurse';
  const canEdit = (isNurse || canManage) && o.status !== 'fulfilled' && o.status !== 'cancelled';
  const canCancel = (isNurse || canManage) && o.status !== 'cancelled' && o.status !== 'fulfilled';

  const saveEdit = () => {
    if (!draft.name.trim()) return;
    onEdit(o, { ...draft, quantity: Number(draft.quantity) || 1 });
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">{o.name}</span>
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${TYPE_COLOR[o.orderType] || 'bg-slate-100 text-slate-600'}`}>{typeLabel}</span>
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${STATUS_COLOR[o.status] || ''}`}>{o.status.replace('_', ' ')}</span>
            {o.quantity > 1 && <span className="text-xs text-slate-400">×{o.quantity}</span>}
          </div>
          {(o.patientName || o.patient) && <p className="mt-0.5 text-xs font-semibold text-[#123B5D]">Patient: {o.patientName || personName(o.patient)}</p>}
          {o.instruction ? <p className="mt-1 flex items-start gap-1.5 text-slate-700"><Stethoscope size={14} className="mt-0.5 shrink-0 text-[#087E8B]" />{o.instruction}</p> : null}
          {o.homeInstruction ? <p className="mt-1 flex items-start gap-1.5 text-slate-600"><Home size={14} className="mt-0.5 shrink-0 text-slate-400" />At home: {o.homeInstruction}</p> : null}
          {o.details ? <p className="mt-0.5 text-slate-500">{o.details}</p> : null}
          {o.nurseComment ? <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800"><MessageSquare size={14} className="mt-0.5 shrink-0" />Nurse: {o.nurseComment}</p> : null}
          <p className="mt-1 text-xs text-slate-400">
            {dateOnly(o.orderDate)}{o.orderedByName ? ` • by ${o.orderedByName}` : ''}{o.fulfilledByName ? ` • done by ${o.fulfilledByName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Completion is the nurse's job. Nurse + doctor/admin can edit; doctor/admin can delete. */}
          {o.status !== 'fulfilled' && isNurse && <button type="button" onClick={() => { setCompleting((v) => !v); setEditing(false); }} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Complete</button>}
          {canEdit && <button type="button" onClick={() => { setEditing((v) => !v); setCompleting(false); }} title="Edit" className="inline-flex items-center gap-1 rounded-lg border border-[#123B5D]/30 bg-white px-2.5 py-1.5 text-xs font-bold text-[#123B5D] hover:bg-slate-50"><Pencil size={13} /> Edit</button>}
          {canCancel && <button type="button" onClick={() => onStatus(o, 'cancelled')} title="Cancel" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><X size={13} /></button>}
          {canManage && <button type="button" onClick={() => onRemove(o)} title="Delete" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 size={14} /></button>}
        </div>
      </div>

      {editing && (
        <div className="mt-2 space-y-2 rounded-lg border border-[#123B5D]/20 bg-slate-50/70 p-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input" placeholder="Medicine / name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <input className="input" type="number" min="1" placeholder="Qty" value={draft.quantity} onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))} />
            <input className="input" placeholder="Details / dose" value={draft.details} onChange={(e) => setDraft((d) => ({ ...d, details: e.target.value }))} />
          </div>
          <textarea className="input min-h-[46px]" placeholder="Instruction (what to do)" value={draft.instruction} onChange={(e) => setDraft((d) => ({ ...d, instruction: e.target.value }))} />
          <textarea className="input min-h-[46px]" placeholder="How the patient does it at home" value={draft.homeInstruction} onChange={(e) => setDraft((d) => ({ ...d, homeInstruction: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-light py-1.5 text-xs" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary py-1.5 text-xs" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      )}

      {completing && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
          <textarea className="input min-h-[52px]" placeholder="Comment on completion (optional)…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-light py-1.5 text-xs" onClick={() => setCompleting(false)}>Cancel</button>
            <button className="btn-primary py-1.5 text-xs" onClick={() => { onComplete(o, comment); setCompleting(false); setComment(''); }}>Mark done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const canCreate = ['admin', 'doctor'].includes(user?.role);
  const isNurse = user?.role === 'nurse';
  const canManage = ['admin', 'doctor'].includes(user?.role);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthOrders, setMonthOrders] = useState([]);
  const [standingOrders, setStandingOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [patientQuery, setPatientQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([orderApi.list({ month, year }), orderApi.list({ standing: true })])
      .then(([m, s]) => { setMonthOrders(m.data?.data || []); setStandingOrders(s.data?.data || []); })
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year]);

  // Patients for the tag picker (doctors tag the order to a patient).
  useEffect(() => {
    if (!canCreate) return;
    patientApi.list({ limit: 1000 }).then((r) => setPatients(r.data?.data || [])).catch(() => setPatients([]));
  }, [canCreate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const typeDef = ORDER_TYPES.find((t) => t.value === form.orderType) || ORDER_TYPES[0];

  const patientMatches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients.filter((p) => `${personName(p)} ${p.mrn || ''} ${p.phone || ''}`.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  const pickPatient = (p) => {
    set('patient', p._id);
    set('patientName', personName(p));
    setPatientQuery(`${personName(p)} · ${p.mrn || ''}`);
  };

  const addOrder = async () => {
    if (!form.name.trim()) return toast.error('Enter a medicine / order name');
    if (form.orderType === 'nurse' && !form.patient) return toast.error('Tag a patient for a nurse order');
    setSaving(true);
    try {
      await orderApi.create({ ...form, quantity: Number(form.quantity) || 1 });
      toast.success(form.orderType === 'nurse' ? 'Order placed — sent to the nurse' : 'Order recorded');
      setForm(blankForm());
      setPatientQuery('');
      setShowAdd(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not place order');
    } finally { setSaving(false); }
  };

  const setStatus = async (order, status) => {
    try { await orderApi.update(order._id, { status }); toast.success(`Marked ${status.replace('_', ' ')}`); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Update failed'); }
  };
  const complete = async (order, nurseComment) => {
    try { await orderApi.update(order._id, { status: 'fulfilled', nurseComment }); toast.success('Order completed'); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Update failed'); }
  };
  const remove = async (order) => {
    if (!window.confirm(`Delete order "${order.name}"?`)) return;
    try { await orderApi.remove(order._id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };
  const edit = async (order, changes) => {
    try { await orderApi.update(order._id, changes); toast.success('Order updated'); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Update failed'); }
  };

  const datedOrders = useMemo(() => monthOrders.filter((o) => !o.standing), [monthOrders]);
  const years = [year + 1, year, year - 1].filter((y, i, a) => a.indexOf(y) === i);

  const rowProps = { canManage, isNurse, onStatus: setStatus, onComplete: complete, onRemove: remove, onEdit: edit };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle="Doctor instructions for the care team. Nurse orders route to the nurse to carry out and complete; visible to doctors and nurses."
        action={canCreate ? <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAdd((v) => !v)}><Plus size={16} />{showAdd ? 'Close' : 'Add order'}</button> : null}
      />

      {canCreate && showAdd && (
        <section className="card space-y-3 p-5">
          <h2 className="font-extrabold text-slate-900">New order</h2>

          {/* ORDER TYPE */}
          <div>
            <label className="label">Order type</label>
            <div className="flex flex-wrap gap-2">
              {ORDER_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => set('orderType', t.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.orderType === t.value ? 'border-[#123B5D] bg-[#123B5D]/5 text-[#123B5D]' : 'border-slate-300 text-slate-600'}`}>
                  {t.label}{!t.functional && <span className="ml-1 text-[10px] font-semibold text-slate-400">(soon)</span>}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{typeDef.hint}</p>
          </div>

          {!typeDef.functional ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              <b className="text-slate-700">{typeDef.label} orders</b> are a placeholder for now and not functional yet. This type is shown so the workflow is ready, but the order is not routed anywhere.
            </div>
          ) : (
            <>
              {/* PATIENT TAG */}
              <div className="relative">
                <label className="label">Tag patient</label>
                <input className="input" placeholder="Search name, MRN or phone…" value={patientQuery}
                  onChange={(e) => { setPatientQuery(e.target.value); set('patient', ''); set('patientName', ''); }} />
                {patientMatches.length > 0 && !form.patient && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {patientMatches.map((p) => (
                      <button type="button" key={p._id} onClick={() => pickPatient(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <span className="font-semibold text-slate-800">{personName(p)}</span>
                        <span className="text-xs text-slate-400">{p.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.patient && <p className="mt-1 text-xs font-semibold text-emerald-700">Tagged: {form.patientName}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>{ORDER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div><label className="label">Medicine / name</label><input className="input" placeholder="e.g. Panadol 500mg" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div><label className="label">Quantity</label><input className="input" type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></div>
                <div className="lg:col-span-3"><label className="label">Instruction (what to do)</label><textarea className="input min-h-[52px]" placeholder="e.g. Give Panadol 500mg twice daily / set the drip at…" value={form.instruction} onChange={(e) => set('instruction', e.target.value)} /></div>
                <div className="lg:col-span-3"><label className="label">How the patient does it at home</label><textarea className="input min-h-[52px]" placeholder="Home instructions for the patient…" value={form.homeInstruction} onChange={(e) => set('homeInstruction', e.target.value)} /></div>
                <div><label className="label">Order date</label><input className="input" type="date" value={form.orderDate} onChange={(e) => set('orderDate', e.target.value)} /></div>
                <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 p-2.5 text-sm"><input type="checkbox" checked={form.standing} onChange={(e) => set('standing', e.target.checked)} /> Standing order (recurring)</label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button className="btn-light py-2 text-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary py-2 text-sm" onClick={addOrder} disabled={saving}>{saving ? 'Placing…' : 'Place order'}</button>
          </div>
        </section>
      )}

      {/* STANDING ORDERS */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-extrabold text-slate-900"><Pin size={16} className="text-[#123B5D]" /> Standing Orders ({standingOrders.length})</h2>
        <div className="space-y-2">
          {standingOrders.map((o) => <OrderRow key={o._id} o={o} {...rowProps} />)}
          {!standingOrders.length && <EmptyState message="No standing orders." />}
        </div>
      </section>

      {/* ORDERS LIST (month) */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-extrabold text-slate-900">Orders List</h2>
          <div className="flex items-center gap-2">
            <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </div>
        <div className="space-y-2">
          {loading ? <p className="py-4 text-center text-slate-400">Loading…</p> : datedOrders.map((o) => <OrderRow key={o._id} o={o} {...rowProps} />)}
          {!loading && !datedOrders.length && <EmptyState message="No orders for this month." />}
        </div>
      </section>
    </div>
  );
}
