import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Stethoscope, Home, MessageSquare } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import { orderApi } from '../../api/orderApi';
import { dateOnly } from '../../utils/format';

const STATUS_COLOR = {
  ordered: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-800',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

/*
 * Orders recorded on a patient (doctor instructions). Shown in the patient bio
 * for doctors and nurses; a nurse can complete an open order with a comment.
 */
export default function PatientOrdersCard({ patientId, canComplete }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [comment, setComment] = useState('');

  const load = () => {
    setLoading(true);
    orderApi.list({ patient: patientId })
      .then((r) => setOrders(r.data?.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const complete = async (o) => {
    try {
      await orderApi.update(o._id, { status: 'fulfilled', nurseComment: comment });
      toast.success('Order completed'); setActiveId(null); setComment(''); load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Update failed'); }
  };

  return (
    <section className="card p-5">
      <h3 className="mb-3 text-lg font-extrabold text-slate-900">Orders</h3>
      {loading ? <p className="py-4 text-center text-sm text-slate-400">Loading…</p> : !orders.length ? (
        <EmptyState message="No orders for this patient" />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o._id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{o.name}</span>
                    <span className="rounded-md bg-[#087E8B]/10 px-1.5 py-0.5 text-xs font-bold capitalize text-[#087E8B]">{o.orderType || 'nurse'}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${STATUS_COLOR[o.status] || ''}`}>{o.status.replace('_', ' ')}</span>
                  </div>
                  {o.instruction ? <p className="mt-1 flex items-start gap-1.5 text-slate-700"><Stethoscope size={14} className="mt-0.5 shrink-0 text-[#087E8B]" />{o.instruction}</p> : null}
                  {o.homeInstruction ? <p className="mt-1 flex items-start gap-1.5 text-slate-600"><Home size={14} className="mt-0.5 shrink-0 text-slate-400" />At home: {o.homeInstruction}</p> : null}
                  {o.nurseComment ? <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800"><MessageSquare size={14} className="mt-0.5 shrink-0" />Nurse: {o.nurseComment}</p> : null}
                  <p className="mt-1 text-xs text-slate-400">{dateOnly(o.orderDate)}{o.orderedByName ? ` • by ${o.orderedByName}` : ''}{o.fulfilledByName ? ` • done by ${o.fulfilledByName}` : ''}</p>
                </div>
                {canComplete && o.status !== 'fulfilled' && o.orderType === 'nurse' && (
                  <button type="button" onClick={() => { setActiveId(activeId === o._id ? null : o._id); setComment(''); }} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Complete</button>
                )}
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
        </div>
      )}
    </section>
  );
}
