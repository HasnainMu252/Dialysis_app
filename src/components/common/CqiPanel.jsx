import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Pencil } from 'lucide-react';
import { cqiApi, CQI_ROLES } from '../../api/cqiApi';
import { useAuth } from '../../context/AuthContext';
import NoteAuthor from './NoteAuthor';

const PHASES = [
  { value: 'general', label: 'General' },
  { value: 'during', label: 'During dialysis' },
  { value: 'after', label: 'After dialysis' },
];

/**
 * CQI comments for one patient — an APPEND LOG. Any clinical role that meets the
 * patient (nurse, technician, social worker, doctor, dietitian) can add entries
 * over time; each author (or admin) may edit/delete their own. Reviewed monthly
 * by admin/DON on the CQI Review page.
 *
 * Props: patientId (id or mrn, required), session (optional), defaultPhase, compact.
 */
export default function CqiPanel({ patientId, session, defaultPhase = 'general', compact = false }) {
  const { user } = useAuth();
  const canAuthor = CQI_ROLES.includes(user?.role);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState(defaultPhase);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editPhase, setEditPhase] = useState('general');

  const load = () => {
    if (!patientId) return;
    setLoading(true);
    cqiApi.list(patientId)
      .then((r) => setComments(r.data?.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const add = async () => {
    if (!text.trim()) { toast.error('Enter a comment'); return; }
    setSaving(true);
    try {
      await cqiApi.add(patientId, { comment: text.trim(), phase, session });
      toast.success('CQI comment added');
      setText('');
      setPhase(defaultPhase);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to add CQI comment');
    } finally { setSaving(false); }
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setEditText(c.comment || '');
    setEditPhase(c.phase || 'general');
  };

  const saveEdit = async (c) => {
    if (!editText.trim()) { toast.error('Comment cannot be empty'); return; }
    try {
      await cqiApi.update(c._id, { comment: editText.trim(), phase: editPhase });
      toast.success('Updated');
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const remove = async (c) => {
    if (!window.confirm('Delete this CQI comment?')) return;
    try {
      await cqiApi.remove(c._id);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {canAuthor && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Add CQI comment ({user?.role?.replace('_', ' ')})
          </p>
          <textarea className="input min-h-20 w-full" placeholder="Quality / care observation for this patient…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={phase} onChange={(e) => setPhase(e.target.value)}>
              {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={add} disabled={saving}>{saving ? 'Adding…' : 'Add comment'}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading && <p className="text-sm text-slate-400">Loading CQI comments…</p>}
        {!loading && !comments.length && <p className="text-sm text-slate-400">No CQI comments yet.</p>}
        {comments.map((c) => {
          const mine = String(c.author) === String(user?._id);
          const canManage = mine || user?.role === 'admin';
          const isEditing = editingId === c._id;
          return (
            <div key={c._id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea className="input min-h-16 w-full" value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="input w-auto" value={editPhase} onChange={(e) => setEditPhase(e.target.value)}>
                      {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <button type="button" className="btn-primary" onClick={() => saveEdit(c)}>Save</button>
                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mr-2 rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-bold capitalize text-indigo-700">{c.phase || 'general'}</span>
                    <span className="text-slate-700">{c.comment}</span>
                    <NoteAuthor name={c.authorName} role={c.authorRole} at={c.lastEditedAt || c.updatedAt} />
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      {mine && (
                        <button type="button" title="Edit" className="rounded-full p-1 text-slate-400 hover:bg-blue-100 hover:text-blue-600" onClick={() => startEdit(c)}><Pencil size={14} /></button>
                      )}
                      <button type="button" title="Delete" className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600" onClick={() => remove(c)}><X size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
