import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardList, Stethoscope, Home } from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { dateOnly, personName } from '../../utils/format';

/*
 * Compact "Doctor Orders" panel for the Nurse / Admin dashboards. Shows open
 * nurse orders doctors placed (patient, instruction, home instruction) and lets
 * the nurse complete one with a comment.
 */
export default function OrdersPanel({ limit = 6 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [comment, setComment] = useState('');

  const load = () => {
    setLoading(true);
    orderApi.list({ status: 'ordered', orderType: 'nurse' })
      .then((r) => setOrders(r.data?.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const complete = async (o) => {
    try {
      await orderApi.update(o._id, { status: 'fulfilled', nurseComment: comment });
      toast.success('Order completed');
      setActiveId(null); setComment('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <ClipboardList size={18} className="text-[#123B5D]" /> Doctor Orders
        </h2>
        <Link to="/orders" className="text-sm font-bold text-[#123B5D] hover:underline">View all →</Link>
      </div>
      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : !orders.length ? (
        <p className="py-4 text-center text-sm text-slate-400">No open orders.</p>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, limit).map((o) => (
            <div key={o._id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900">{o.name}</span>
                  {o.quantity > 1 && <span className="ml-1 text-xs text-slate-400">×{o.quantity}</span>}
                  {(o.patientName || o.patient) && <p className="text-xs font-semibold text-[#123B5D]">Patient: {o.patientName || personName(o.patient)}</p>}
                  {o.instruction ? <p className="mt-0.5 flex items-start gap-1.5 text-slate-700"><Stethoscope size={13} className="mt-0.5 shrink-0 text-[#087E8B]" />{o.instruction}</p> : null}
                  {o.homeInstruction ? <p className="mt-0.5 flex items-start gap-1.5 text-slate-500"><Home size={13} className="mt-0.5 shrink-0 text-slate-400" />At home: {o.homeInstruction}</p> : null}
                  <p className="mt-0.5 text-xs text-slate-400">{dateOnly(o.orderDate)}{o.orderedByName ? ` • by ${o.orderedByName}` : ''}</p>
                </div>
                <button type="button" onClick={() => { setActiveId(activeId === o._id ? null : o._id); setComment(''); }} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Complete</button>
              </div>
              {activeId === o._id && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                  <textarea className="input min-h-[48px]" placeholder="Comment on completion (optional)…" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="mt-2 flex justify-end gap-2">
                    <button className="btn-light py-1.5 text-xs" onClick={() => setActiveId(null)}>Cancel</button>
                    <button className="btn-primary py-1.5 text-xs" onClick={() => complete(o)}>Mark done</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {orders.length > limit && <p className="pt-1 text-center text-xs font-semibold text-slate-400">+{orders.length - limit} more open</p>}
        </div>
      )}
    </section>
  );
}
