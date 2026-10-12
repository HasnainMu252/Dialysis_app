import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Package, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { inventoryApi, INVENTORY_CATEGORIES, TXN_TYPES } from '../../api/inventoryApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/common/EmptyState';

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const BLANK = { name: '', category: 'drug', unit: '', quantityOnHand: 0, reorderLevel: 0, supplier: '', notes: '' };
const BLANK_TXN = { type: 'purchase', quantity: 0, note: '', date: '' };

function Field({ label: lbl, children }) {
  return <label className="flex flex-col gap-1"><span className={label}>{lbl}</span>{children}</label>;
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [expanded, setExpanded] = useState(null);
  const [txnFor, setTxnFor] = useState(null);
  const [txn, setTxn] = useState({ ...BLANK_TXN });

  const load = () => {
    setLoading(true);
    inventoryApi.list(cat ? { category: cat } : {})
      .then((r) => setItems(r.data?.data || []))
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load inventory'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cat]);

  const counts = useMemo(() => ({
    total: items.length,
    drugs: items.filter((i) => i.category === 'drug').length,
    low: items.filter((i) => (i.quantityOnHand ?? 0) <= (i.reorderLevel ?? 0)).length,
  }), [items]);

  const create = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    try {
      await inventoryApi.create({ ...form, quantityOnHand: Number(form.quantityOnHand) || 0, reorderLevel: Number(form.reorderLevel) || 0 });
      toast.success('Item added'); setForm({ ...BLANK }); setAdding(false); load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not add item'); }
  };

  const remove = async (it) => {
    if (!window.confirm(`Delete ${it.name}?`)) return;
    try { await inventoryApi.remove(it._id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const addTxn = async (id) => {
    const qty = Number(txn.quantity) || 0;
    if (!qty) { toast.error('Enter a quantity'); return; }
    try {
      await inventoryApi.transaction(id, { ...txn, quantity: qty, date: txn.date || undefined });
      toast.success('Stock updated'); setTxn({ ...BLANK_TXN }); setTxnFor(null); load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not update stock'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchasing & Supply Inventory"
        subtitle="Drugs and non-drug items — stock on hand, purchases and usage."
        action={<button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700"><Plus size={18} /> Add Item</button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Items" value={counts.total} icon={Package} />
        <StatCard title="Drugs" value={counts.drugs} icon={Package} />
        <StatCard title="At / below reorder" value={counts.low} icon={AlertTriangle} />
      </div>

      <div className="flex items-center gap-2">
        <select className={`${inputCls} w-auto`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {INVENTORY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {adding && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">New Item</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name *"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{INVENTORY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
            <Field label="Unit"><input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="box / vial / each" /></Field>
            <Field label="Quantity on hand"><input type="number" className={inputCls} value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} /></Field>
            <Field label="Reorder level"><input type="number" className={inputCls} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
            <Field label="Supplier"><input className={inputCls} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={create} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Add item</button>
          </div>
        </div>
      )}

      {loading ? <p className="py-6 text-center text-slate-400">Loading…</p>
        : items.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><EmptyState message="No inventory items yet." /></div>
          : (
            <div className="space-y-3">
              {items.map((it) => {
                const low = (it.quantityOnHand ?? 0) <= (it.reorderLevel ?? 0);
                const isOpen = expanded === it._id;
                return (
                  <div key={it._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Package size={20} /></div>
                        <div>
                          <p className="font-bold text-slate-900">{it.name} <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold capitalize text-slate-600">{it.category === 'non_drug' ? 'non-drug' : 'drug'}</span></p>
                          <p className="text-xs text-slate-400">On hand: <b className={low ? 'text-red-600' : 'text-slate-700'}>{it.quantityOnHand ?? 0}</b>{it.unit ? ` ${it.unit}` : ''} · reorder at {it.reorderLevel ?? 0}{it.supplier ? ` · ${it.supplier}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {low && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Low stock</span>}
                        <button type="button" onClick={() => { setTxnFor(txnFor === it._id ? null : it._id); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">+ Stock</button>
                        <button type="button" onClick={() => setExpanded(isOpen ? null : it._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                        <button type="button" onClick={() => remove(it)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </div>

                    {txnFor === it._id && (
                      <div className="border-t border-slate-100 bg-emerald-50/40 p-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Type"><select className={inputCls} value={txn.type} onChange={(e) => setTxn({ ...txn, type: e.target.value })}>{TXN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
                          <Field label="Quantity"><input type="number" className={inputCls} value={txn.quantity} onChange={(e) => setTxn({ ...txn, quantity: e.target.value })} /></Field>
                          <Field label="Date"><input type="date" className={inputCls} value={txn.date} onChange={(e) => setTxn({ ...txn, date: e.target.value })} /></Field>
                          <Field label="Note"><input className={inputCls} value={txn.note} onChange={(e) => setTxn({ ...txn, note: e.target.value })} /></Field>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => setTxnFor(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                          <button type="button" onClick={() => addTxn(it._id)} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Record</button>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div className="border-t border-slate-100 p-4">
                        <h4 className="mb-2 text-sm font-bold text-slate-700">Transactions ({(it.transactions || []).length})</h4>
                        {(it.transactions || []).length === 0 ? <p className="text-sm text-slate-400">No transactions yet.</p> : (
                          <div className="space-y-2">
                            {[...(it.transactions || [])].reverse().map((t) => (
                              <div key={t._id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
                                <span className={`mr-2 rounded-md px-1.5 py-0.5 text-xs font-bold ${t.type === 'usage' ? 'bg-red-100 text-red-700' : t.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.type}</span>
                                <span className="text-slate-700">{t.quantity}{it.unit ? ` ${it.unit}` : ''}</span>
                                <span className="ml-2 text-slate-500">{t.date ? new Date(t.date).toLocaleDateString() : ''}</span>
                                {t.note ? <span className="ml-2 text-slate-600">— {t.note}</span> : null}
                                <span className="ml-2 text-xs text-slate-400">by {t.byName || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {it.notes ? <p className="mt-3 text-sm text-slate-500"><b>Notes:</b> {it.notes}</p> : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}
