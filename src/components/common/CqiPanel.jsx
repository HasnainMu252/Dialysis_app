import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { cqiApi, CQI_ROLES } from '../../api/cqiApi';
import { useAuth } from '../../context/AuthContext';
import NoteAuthor from './NoteAuthor';

const PHASES = [
  { value: 'general', label: 'General' },
  { value: 'during', label: 'During dialysis' },
  { value: 'after', label: 'After dialysis' },
];

/**
 * CQI comments for one patient. Nurse / Technician / Social Worker each keep
 * their OWN editable comment (upsert). Everyone allowed to view sees all three.
 *
 * Props:
 *  - patientId (id or mrn) — required
 *  - session   — optional session id for "during dialysis" context
 *  - defaultPhase — 'during' | 'after' | 'general'
 *  - compact   — tighter layout for list popovers
 */
export default function CqiPanel({ patientId, session, defaultPhase = 'general', compact = false }) {
  const { user } = useAuth();
  const canAuthor = CQI_ROLES.includes(user?.role);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState(defaultPhase);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!patientId) return;
    setLoading(true);
    cqiApi.list(patientId)
      .then((r) => {
        const list = r.data?.data || [];
        setComments(list);
        const mine = list.find((c) => String(c.author) === String(user?._id) || c.authorRole === user?.role);
        if (mine) { setText(mine.comment || ''); setPhase(mine.phase || defaultPhase); }
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const save = async () => {
    if (!text.trim()) { toast.error('Enter a comment'); return; }
    setSaving(true);
    try {
      await cqiApi.upsert(patientId, { comment: text.trim(), phase, session });
      toast.success('CQI comment saved');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save CQI comment');
    } finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (!window.confirm('Delete this CQI comment?')) return;
    try {
      await cqiApi.remove(c._id);
      toast.success('Deleted');
      if (String(c.author) === String(user?._id)) setText('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {canAuthor && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Your CQI comment ({user?.role?.replace('_', ' ')})</p>
          <textarea className="input min-h-20 w-full" placeholder="Quality / care observation for this patient…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={phase} onChange={(e) => setPhase(e.target.value)}>
              {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save my comment'}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading && <p className="text-sm text-slate-400">Loading CQI comments…</p>}
        {!loading && !comments.length && <p className="text-sm text-slate-400">No CQI comments yet.</p>}
        {comments.map((c) => {
          const mine = String(c.author) === String(user?._id);
          return (
            <div key={c._id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="min-w-0">
                <span className="mr-2 rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-bold capitalize text-indigo-700">{c.phase || 'general'}</span>
                <span className="text-slate-700">{c.comment}</span>
                <NoteAuthor name={c.authorName} role={c.authorRole} at={c.lastEditedAt || c.updatedAt} />
              </div>
              {(mine || user?.role === 'admin') && (
                <button type="button" title="Delete" className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600" onClick={() => remove(c)}><X size={14} /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
