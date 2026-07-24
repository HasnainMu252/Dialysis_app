import { ShieldCheck, PenLine } from 'lucide-react';
import NoteAuthor from '../common/NoteAuthor';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '');

/**
 * Shown when a session is at status 'pending_review' (a technician submitted it).
 * Only a nurse or admin can finalise: they attest and type their full name as a
 * digital signature, which closes the session and releases the station.
 */
export default function NurseReviewCard({
  session,
  canFinalize,
  signature,
  setSignature,
  reviewNotes,
  setReviewNotes,
  attested,
  setAttested,
  onFinalize,
  loading,
}) {
  return (
    <section className="card border-2 border-amber-200 bg-amber-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-amber-900">
            <ShieldCheck size={18} /> Pending Nurse Review
          </h3>
          <p className="mt-1 text-sm text-amber-800/80">
            This dialysis was submitted by a technician and is waiting for a nurse to review and close it.
          </p>
        </div>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase text-amber-900">Awaiting sign-off</span>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Submitted by</p>
        <NoteAuthor
          name={session.submittedForReviewByName}
          role={session.submittedForReviewByRole}
          at={session.submittedForReviewAt}
        />
        {session.submissionNotes && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{session.submissionNotes}</p>
        )}
      </div>

      {canFinalize ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Review notes (optional)</span>
            <textarea className="input min-h-20 w-full resize-y" placeholder="Anything to record about this review" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><PenLine size={12} /> Digital signature — type your full name *</span>
            <input className="input w-full font-semibold tracking-wide" placeholder="e.g. Sarah Ahmed" value={signature} onChange={(e) => setSignature(e.target.value)} />
          </label>

          <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
            <span>I have reviewed this dialysis record and confirm it is accurate and complete.</span>
          </label>

          <button type="button" className="btn-primary w-full sm:w-auto" onClick={onFinalize} disabled={loading || !signature.trim() || !attested}>
            {loading ? 'Closing...' : 'Sign & Close Session'}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-500">
          Only a nurse can review and close this session.
        </p>
      )}

      {session.nurseReview?.reviewedAt && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Signed off</p>
          <p className="mt-1 font-semibold text-emerald-900">{session.nurseReview.signatureName}</p>
          <NoteAuthor name={session.nurseReview.reviewedByName} role={session.nurseReview.reviewedByRole} at={session.nurseReview.reviewedAt} />
          {session.nurseReview.reviewNotes && <p className="mt-2 text-sm text-slate-600">{session.nurseReview.reviewNotes}</p>}
        </div>
      )}
    </section>
  );
}
