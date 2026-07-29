import { useState } from 'react';
import { Zap, X, Plus } from 'lucide-react';
import { COMMON_HOME_MEDICATIONS } from '../../constants/commonMedications';
import Portal from './Portal';

/**
 * "Quick Add" button + popup listing common home medications by category.
 * Tapping a medicine calls onPick(med) with { name, dose, unit, route, frequency }
 * so the parent can prefill (or directly submit) the home-medication form.
 */
export default function HomeMedQuickAdd({ onPick, buttonClassName = 'btn-light' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const groups = COMMON_HOME_MEDICATIONS.map((g) => ({
    ...g,
    items: q ? g.items.filter((m) => m.name.toLowerCase().includes(q)) : g.items,
  })).filter((g) => g.items.length);

  const pick = (med) => {
    onPick(med);
    setOpen(false); // prefill the form so the user can adjust dose before adding
  };

  return (
    <>
      <button type="button" className={`${buttonClassName} inline-flex items-center gap-2`} onClick={() => setOpen(true)}>
        <Zap size={15} /> Quick Add
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setOpen(false)}>
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h3 className="flex items-center gap-2 font-bold text-slate-900"><Zap size={17} className="text-amber-500" /> Quick Add Home Medication</h3>
                <button type="button" onClick={() => setOpen(false)}><X size={18} className="text-slate-400" /></button>
              </div>

              <div className="border-b p-3">
                <input className="input w-full" placeholder="Search medications..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
                <p className="mt-2 text-xs text-slate-400">Pick a medication to load it into the form, then adjust the dose and click Add.</p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                {!groups.length ? (
                  <p className="text-sm text-slate-400">No medications match "{query}".</p>
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => (
                      <div key={g.category}>
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">{g.category}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {g.items.map((m) => (
                            <button
                              key={m.name}
                              type="button"
                              onClick={() => pick(m)}
                              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-bold text-slate-800">{m.name}</span>
                                <span className="block text-xs text-slate-500">{m.dose} {m.unit} · {m.route} · {m.frequency}</span>
                              </span>
                              <Plus size={16} className="shrink-0 text-emerald-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t px-5 py-3 text-right">
                <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Done</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
