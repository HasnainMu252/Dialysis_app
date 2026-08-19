import { X } from 'lucide-react';
import Portal from '../common/Portal';

/**
 * Popup wrapper for a treatment-flow action (Home Meds, Session Notes, Labs,
 * Medication Administration). Renders nothing unless `open`. Clicking the
 * backdrop or the X closes it. The body scrolls when tall.
 */
export default function WorkflowActionModal({ open, title, icon: Icon, onClose, children }) {
  if (!open) return null;
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 sm:p-6"
        onClick={onClose}
      >
        <div
          className="my-4 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 text-white">
            <h3 className="flex items-center gap-2 font-bold">
              {Icon ? <Icon size={18} /> : null}
              {title}
            </h3>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
