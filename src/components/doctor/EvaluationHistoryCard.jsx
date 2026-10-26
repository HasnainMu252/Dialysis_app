import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import EvaluationForm from './EvaluationForm';
import EmptyState from '../common/EmptyState';
import { evaluationApi } from '../../api/evaluationApi';
import { defaultFields } from '../../constants/evaluationForm';
import { shiftLabel } from '../../constants';
import { dateOnly } from '../../utils/format';

/*
 * Per-patient history of weekly evaluations or monthly rounds, shown in the
 * patient bio tabs. Doctors can add a new one here too; everything syncs with
 * the shift-wise doctor pages (same records).
 */
export default function EvaluationHistoryCard({ patientId, kind, canEdit }) {
  const title = kind === 'weekly' ? 'Weekly Evaluation' : 'Monthly Round';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(() => defaultFields(kind));
  const [roundNumber, setRoundNumber] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    evaluationApi.list(patientId, { kind })
      .then((r) => setRows(r.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId, kind]);

  // Distinct monthly rounds present (for the "R1, R2…" summary).
  const roundsDone = [...new Set(rows.map((r) => r.roundNumber).filter(Boolean))].sort((a, b) => a - b);

  const save = async () => {
    setSaving(true);
    try {
      await evaluationApi.create(patientId, { kind, fields: draft, roundNumber: kind === 'monthly' ? Number(roundNumber) : null });
      toast.success(`${title} saved`);
      setAdding(false);
      setDraft(defaultFields(kind));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{title} History</h3>
          <p className="text-sm font-semibold text-slate-500">
            {rows.length} {kind === 'weekly' ? 'evaluation' : 'round'}{rows.length === 1 ? '' : 's'} on record
            {kind === 'monthly' && roundsDone.length ? ` · ${roundsDone.map((r) => `R${r}`).join(', ')}` : ''}
          </p>
        </div>
        {canEdit && !adding && (
          <button className="btn-primary inline-flex items-center gap-1.5" onClick={() => { setDraft(defaultFields(kind)); setAdding(true); }}>
            <Plus size={16} /> New {title}
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-5 rounded-2xl border border-[#123B5D]/20 bg-slate-50/50 p-3">
          {kind === 'monthly' && (
            <div className="mb-3 max-w-[200px]">
              <label className="label">Round</label>
              <select className="input" value={roundNumber} onChange={(e) => setRoundNumber(Number(e.target.value))}>
                {[1, 2, 3, 4].map((r) => <option key={r} value={r}>Round {r}</option>)}
              </select>
            </div>
          )}
          <EvaluationForm kind={kind} value={draft} onChange={setDraft} />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-light" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : `Save ${title}`}</button>
          </div>
        </div>
      )}

      {loading ? <p className="py-4 text-center text-sm text-slate-400">Loading…</p> : !rows.length ? (
        <EmptyState message={`No ${title.toLowerCase()} records yet`} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const open = openId === r._id;
            return (
              <div key={r._id} className="rounded-xl border border-slate-200">
                <button type="button" onClick={() => setOpenId(open ? null : r._id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {kind === 'monthly' && r.roundNumber && <span className="rounded-md bg-[#123B5D] px-2 py-0.5 text-xs font-bold text-white">R{r.roundNumber}</span>}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{dateOnly(r.createdAt)}{r.shift ? ` · ${shiftLabel(r.shift)}` : ''}</p>
                      <p className="text-xs text-slate-500">{r.authorName || 'Physician'}{r.month ? ` · ${r.month}/${r.year}` : ''}</p>
                    </div>
                  </div>
                  {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {open && (
                  <div className="border-t border-slate-200 p-3">
                    <EvaluationForm kind={kind} value={r.fields || {}} onChange={() => {}} readOnly />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
