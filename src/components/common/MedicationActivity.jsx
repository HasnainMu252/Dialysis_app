import { useEffect, useState } from 'react';
import { medicationApi } from '../../api/medicationApi';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '');
const roleLabel = (r) => (r ? r.replace('_', ' ') : '');

const STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-amber-100 text-amber-700',
  deleted: 'bg-slate-200 text-slate-600',
};

/**
 * Read-only medication activity for a patient — a timeline of when each
 * medication was added, stopped (cancelled) or removed, and by whom.
 * Used on the Medication History tab so billers can watch med changes.
 */
export default function MedicationActivity({ patientId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    medicationApi.history({ patient: patientId })
      .then((r) => setRows(r.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="card p-5"><p className="text-sm text-slate-400">Loading medication activity…</p></div>;

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Medication Activity</h2>
      <p className="mb-4 text-sm text-slate-500">When each medication was added, stopped or removed — with who and when.</p>

      {!rows.length ? (
        <p className="text-sm text-slate-400">No medication activity recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Medication</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Added</th>
                <th className="px-3 py-3">Stopped / Removed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m._id} className="align-top hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.dose}{m.unit ? ` ${m.unit}` : ''}{m.route ? ` · ${m.route}` : ''}{m.quantity > 1 ? ` × ${m.quantity}` : ''}</p>
                  </td>
                  <td className="px-3 py-3"><span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${m.source === 'home' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{m.source === 'home' ? 'Home' : 'Dialysis'}</span></td>
                  <td className="px-3 py-3">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold capitalize ${STATUS_STYLE[m.status] || 'bg-slate-100 text-slate-600'}`}>{m.status === 'deleted' ? 'Removed' : m.status || 'active'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {fmt(m.addedAt)}
                    {m.addedByName ? <span className="block text-slate-400">by {m.addedByName}{m.addedByRole ? ` (${roleLabel(m.addedByRole)})` : ''}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {m.cancelledAt && <div className="text-amber-700">Stopped {fmt(m.cancelledAt)}{m.cancelledByName ? ` by ${m.cancelledByName}` : ''}{m.cancelReason ? ` — ${m.cancelReason}` : ''}</div>}
                    {m.deletedAt && <div className="text-slate-500">Removed {fmt(m.deletedAt)}{m.deletedByName ? ` by ${m.deletedByName}` : ''}</div>}
                    {!m.cancelledAt && !m.deletedAt && <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
