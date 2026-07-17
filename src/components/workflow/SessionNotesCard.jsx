import { X } from 'lucide-react';
import NoteAuthor from '../common/NoteAuthor';
import CqiPanel from '../common/CqiPanel';

/**
 * Session notes card. Access-type options are role-specific:
 *   Nurse      -> Catheter, Tunnel, Quinton, Other
 *   Technician -> AV, Fistula, AV Graft, Other
 * Choosing "Other" reveals a free-text field. Also hosts the per-patient CQI
 * comments (nurse / technician / social worker) for during/after dialysis.
 */
export default function SessionNotesCard({
  accessTypes,
  noteForm,
  setNoteForm,
  onSave,
  saving,
  notes,
  onDelete,
  patientId,
  sessionId,
}) {
  const isOther = noteForm.accessType === 'Other';

  return (
    <section className="card p-5">
      <h3 className="font-extrabold text-slate-900">Session Notes / Comments</h3>
      <p className="mt-1 text-sm text-slate-500">Record how the patient was accessed and any observation during dialysis. Your name and role are saved with each note and shown with the SOAP notes in the session detail.</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-500">Access type</span>
          <select className="input w-full" value={noteForm.accessType} onChange={(e) => setNoteForm((c) => ({ ...c, accessType: e.target.value, accessOther: e.target.value === 'Other' ? c.accessOther : '' }))}>
            <option value="">Optional</option>
            {accessTypes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-500">Comment</span>
          <input className="input w-full" placeholder="Enter an observation or clinical note" value={noteForm.comment} onChange={(e) => setNoteForm((c) => ({ ...c, comment: e.target.value }))} />
        </div>
      </div>

      {isOther && (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Specify access type</span>
          <input className="input w-full" placeholder="Describe the access type" value={noteForm.accessOther || ''} onChange={(e) => setNoteForm((c) => ({ ...c, accessOther: e.target.value }))} />
        </div>
      )}

      <button type="button" className="btn-primary mt-3" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : '+ Add Note'}</button>

      {notes.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {notes.map((note) => (
            <div key={note._id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
              <div>
                {note.accessType && <span className="mr-2 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{note.accessType === 'Other' && note.accessOther ? note.accessOther : note.accessType}</span>}
                <span className="text-slate-700">{note.comment}</span>
                <NoteAuthor name={note.authorName} role={note.authorRole} at={note.createdAt} />
              </div>
              <button type="button" title="Delete note" className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-600" onClick={() => onDelete(note)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* CQI comments (nurse / technician / social worker) — during & after dialysis */}
      {patientId && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">CQI Comments</h4>
          <CqiPanel patientId={patientId} session={sessionId} defaultPhase="during" />
        </div>
      )}
    </section>
  );
}
