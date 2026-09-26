import { useEffect, useRef, useState } from 'react';
import Portal from './Portal';

import { SECTIONS, MINI } from './cannulationData';

/**
 * Mandatory AVF Cannulation Checklist. Opens as a scrollable popup; the nurse/
 * technician must scroll to the bottom before it can be acknowledged. Calls
 * onAcknowledge() once they've reached the end and confirmed.
 */
export default function CannulationChecklistModal({ open, onClose, onAcknowledge, acknowledgeLabel = 'I have read the checklist', showSkip = false, onSkip }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const bodyRef = useRef(null);

  // Reset the scroll gate every time the modal opens, and scroll its body back
  // to the top, so each open requires a fresh read.
  useEffect(() => {
    if (open) {
      setScrolledToEnd(false);
      // Defer so the body element exists before we scroll it.
      requestAnimationFrame(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
      });
    }
  }, [open]);

  if (!open) return null;

  const handleScroll = () => {
    if (scrolledToEnd) return; // already satisfied — do nothing
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolledToEnd(true);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-6" onClick={onClose}>
        <div className="my-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-rose-700 to-red-600 px-5 py-3 text-white">
            <h3 className="text-sm font-extrabold sm:text-base">AVF Cannulation Instruction — Mandatory</h3>
            <button type="button" onClick={onClose} aria-label="Close" className="text-white/90 hover:text-white">✕</button>
          </div>

          <div className="border-b bg-rose-50 px-5 py-2 text-xs font-semibold text-rose-700">
            Read fully before starting dialysis. Scroll to the end to enable acknowledgement.
          </div>

          <div ref={bodyRef} onScroll={handleScroll} className="max-h-[70vh] overflow-y-auto px-5 py-4">
            <p className="mb-3 text-xs text-slate-500">
              Laminated AVF Cannulation Instruction (Dialysis Unit – 2026 Standard). Chairside reference for nurses and technicians performing AV fistula cannulation.
            </p>

            {SECTIONS.map((s) => (
              <div key={s.n} className="mb-4">
                <h4 className="mb-1.5 text-sm font-bold text-slate-900">{s.n}. {s.title}</h4>
                <ul className="space-y-1">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-sm font-bold text-slate-900">9. Quick Mini-Checklist</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {MINI.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 text-[9px]">✓</span>
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t bg-white px-5 py-3">
            <span className={`text-xs font-semibold ${scrolledToEnd ? 'text-emerald-600' : 'text-slate-400'}`}>
              {scrolledToEnd ? 'Instruction reviewed' : 'Scroll to the end to continue'}
            </span>
            <div className="flex items-center gap-2">
              {showSkip && (
                <button
                  type="button"
                  onClick={() => { onSkip?.(); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                disabled={!scrolledToEnd}
                onClick={() => { onAcknowledge?.(); onClose?.(); }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {acknowledgeLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
