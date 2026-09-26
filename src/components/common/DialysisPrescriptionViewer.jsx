import { useEffect, useRef, useState } from 'react';
import { FileText, X, Stethoscope, History } from 'lucide-react';
import { dialysisPrescriptionApi, RX_VIEW_GROUPS } from '../../api/dialysisPrescriptionApi';
import Portal from './Portal';

const withOther = (rx, key) => {
  const v = rx?.[key];
  if (v === 'Other' && rx?.[`${key}Other`]) return rx[`${key}Other`];
  return v;
};
const fmt = (d) => (d ? new Date(d).toLocaleString() : '');

/**
 * "View Prescription" button + read-only popup showing the doctor's active
 * hemodialysis order. Nurse / technician read this and run the treatment
 * accordingly. `patientId` is an id or MRN.
 */
export default function DialysisPrescriptionViewer({ patientId, buttonClassName = 'btn-light', label = 'View Prescription', onViewed }) {
  const [open, setOpen] = useState(false);
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const bodyRef = useRef(null);
  const viewedFiredRef = useRef(false);

  const markViewed = () => {
    if (viewedFiredRef.current) return;
    viewedFiredRef.current = true;
    onViewed?.();
  };

  const handleBodyScroll = (e) => {
    if (viewedFiredRef.current) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      markViewed();
    }
  };

  // When the prescription finishes loading, if it's short enough that there's
  // nothing to scroll, count it as viewed once.
  useEffect(() => {
    if (!open || !loaded) return;
    const el = bodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) markViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded]);

  // Reset the "viewed" latch each time the popup is closed so re-opening for a
  // different patient requires a fresh read.
  useEffect(() => {
    if (!open) viewedFiredRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open || loaded || !patientId) return;
    setLoading(true);
    dialysisPrescriptionApi.getActive(patientId)
      .then((r) => setRx(r.data?.data || null))
      .catch(() => setRx(null))
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [open, loaded, patientId]);

  useEffect(() => {
    if (!showHistory || historyLoaded || !patientId) return;
    dialysisPrescriptionApi.history(patientId)
      .then((r) => setHistory(r.data?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoaded(true));
  }, [showHistory, historyLoaded, patientId]);

  const val = (key) => {
    if (key === 'minimumSystolic') return rx?.minimumSystolic ? `${rx.minimumSystolic} mmHg` : '—';
    return withOther(rx, key) || '—';
  };

  return (
    <>
      <button type="button" className={`${buttonClassName} inline-flex items-center gap-2`} onClick={() => setOpen(true)}>
        <FileText size={15} /> {label}
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setOpen(false)}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b bg-gradient-to-r from-sky-700 to-cyan-700 px-5 py-3 text-white">
                <h3 className="flex items-center gap-2 font-bold"><Stethoscope size={18} /> Hemodialysis Order</h3>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25">
                    <History size={13} /> {showHistory ? 'Current' : 'History'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5" onScroll={handleBodyScroll} ref={bodyRef}>
                {showHistory ? (
                  <div className="space-y-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Prescription history (newest first)</p>
                    {!historyLoaded ? (
                      <p className="text-sm text-slate-400">Loading history...</p>
                    ) : !history.length ? (
                      <p className="text-sm text-slate-400">No prescription history.</p>
                    ) : (
                      history.map((h, i) => (
                        <div key={h._id} className={`rounded-xl border p-4 ${h.status === 'active' ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${h.status === 'active' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                              {h.status === 'active' ? 'Active' : 'Superseded'}{i === 0 && h.status === 'active' ? ' (current)' : ''}
                            </span>
                            <span className="text-xs text-slate-500">{h.prescribedByName || 'Doctor'} • {fmt(h.prescribedAt || h.createdAt)}</span>
                          </div>
                          <div className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                            {RX_VIEW_GROUPS.flatMap((g) => g.fields).map(([key, lbl]) => {
                              const v = key === 'minimumSystolic' ? (h.minimumSystolic ? `${h.minimumSystolic} mmHg` : '') : (h[key] === 'Other' && h[`${key}Other`] ? h[`${key}Other`] : h[key]);
                              if (!v) return null;
                              return <span key={key}><b>{lbl}:</b> {v}</span>;
                            })}
                          </div>
                          {h.comments && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">{h.comments}</p>}
                        </div>
                      ))
                    )}
                  </div>
                ) : loading ? (
                  <p className="text-sm text-slate-400">Loading prescription...</p>
                ) : !rx ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="font-semibold text-slate-600">No dialysis prescription on file.</p>
                    <p className="mt-1 text-sm text-slate-400">A doctor has not written an order for this patient yet.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-sky-900">Prescribed by {rx.prescribedByName || 'Doctor'}</span>
                      <span className="text-sky-700"> • {fmt(rx.prescribedAt || rx.createdAt)}</span>
                    </div>

                    {RX_VIEW_GROUPS.map((group) => (
                      <div key={group.title}>
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">{group.title}</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {group.fields.map(([key, lbl]) => (
                            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                              <span className="block text-xs font-semibold text-slate-400">{lbl}</span>
                              <b className="mt-0.5 block text-slate-800">{val(key)}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {rx.comments && (
                      <div>
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Comments</p>
                        <p className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">{rx.comments}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
