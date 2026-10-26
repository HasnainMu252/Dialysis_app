import { sectionsFor, ACCESS_OPTIONS, VACCINES } from '../../constants/evaluationForm';

const taCls = 'w-full min-h-[58px] resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#087E8B] focus:ring-2 focus:ring-[#087E8B]/20';
const miniCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#087E8B]';

const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const accessLabel = (v) => (ACCESS_OPTIONS.find((o) => o.value === v) || {}).label || v;

// A read-only line: label on the left, value on the right.
function SummaryLine({ label, children }) {
  return (
    <div className="grid gap-1 py-1.5 md:grid-cols-[205px_minmax(0,1fr)] md:gap-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="whitespace-pre-wrap text-sm text-slate-800">{children}</span>
    </div>
  );
}

/*
 * Read-only summary: shows ONLY the fields that were filled / selected — no
 * empty textareas, no unselected radios, no unchecked vaccines. Used when
 * viewing a saved evaluation in the patient bio.
 */
function EvaluationSummary({ kind, value }) {
  const sections = sectionsFor(kind);
  const renderedSections = sections.map((sec) => {
    const lines = [];
    sec.items.forEach((it, idx) => {
      if (it.t === 'sub') { lines.push({ sub: it.label, key: `sub-${idx}` }); return; }

      if (it.t === 'ta') {
        if (hasText(value[it.name])) lines.push({ key: it.name, label: it.label, node: value[it.name] });
        return;
      }

      if (it.t === 'access') {
        const picked = value[it.name];
        if (!picked || picked === 'not_selected') return;
        const detail = it.details[picked];
        lines.push({ key: it.name, label: 'Access type', node: accessLabel(picked) });
        if (detail && hasText(value[detail.name])) lines.push({ key: detail.name, label: detail.label, node: value[detail.name] });
        return;
      }

      if (it.t === 'struct') {
        const parts = it.grid.filter((g) => hasText(value[g.name])).map((g) => `${g.label}: ${value[g.name]}`);
        if (it.comments && hasText(value[it.comments.name])) parts.push(`${it.comments.label}: ${value[it.comments.name]}`);
        if (parts.length) lines.push({ key: it.title, label: it.title, node: parts.join('\n') });
        return;
      }

      if (it.t === 'vaccines') {
        const given = VACCINES.filter((v) => value[`${it.prefix}_vaccine_${v.key}_given`]).map((v) => {
          const d = value[`${it.prefix}_vaccine_${v.key}_date`];
          const dur = value[`${it.prefix}_vaccine_${v.key}_duration`];
          return `${v.label}${d ? ` · ${d}` : ''}${hasText(dur) ? ` · ${dur}` : ''}`;
        });
        if (given.length) lines.push({ key: `vacc-${it.prefix}`, label: 'Vaccines given', node: given.join('\n') });
        return;
      }

      if (it.t === 'cvtests') {
        const done = [];
        if (value[`${it.prefix}_echocardiogram_done`]) done.push(`Echo${value[`${it.prefix}_echocardiogram_date`] ? ` · ${value[`${it.prefix}_echocardiogram_date`]}` : ''}${hasText(value[`${it.prefix}_echocardiogram_comments`]) ? ` · ${value[`${it.prefix}_echocardiogram_comments`]}` : ''}`);
        if (value[`${it.prefix}_stress_test_done`]) done.push(`Stress test${value[`${it.prefix}_stress_test_date`] ? ` · ${value[`${it.prefix}_stress_test_date`]}` : ''}${hasText(value[`${it.prefix}_stress_test_comments`]) ? ` · ${value[`${it.prefix}_stress_test_comments`]}` : ''}`);
        if (done.length) lines.push({ key: `cv-${it.prefix}`, label: 'CV tests done', node: done.join('\n') });
      }
    });
    // Drop a trailing/orphan subheading with no lines after it.
    const meaningful = lines.filter((l) => !l.sub);
    return meaningful.length ? { sec, lines } : null;
  }).filter(Boolean);

  if (!renderedSections.length) return <p className="py-3 text-sm text-slate-400">No details were recorded on this evaluation.</p>;

  return (
    <div className="space-y-4">
      {renderedSections.map(({ sec, lines }) => (
        <section key={sec.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-2 border-b border-slate-200 pb-2 text-base font-extrabold text-[#123B5D]">{sec.title}</h2>
          {lines.map((l) => (l.sub
            ? <p key={l.key} className="mt-2 text-xs font-bold uppercase tracking-wide text-[#087E8B]">{l.sub}</p>
            : <SummaryLine key={l.key} label={l.label}>{l.node}</SummaryLine>))}
        </section>
      ))}
    </div>
  );
}

// Defined at module scope (NOT inside the component) so inputs keep focus while
// typing — an inline component is a new type each render and remounts its subtree.
function Field({ label, children }) {
  return (
    <div className="grid gap-2 py-2 md:grid-cols-[205px_minmax(0,1fr)] md:items-start md:gap-4">
      <label className="pt-0 text-sm font-semibold text-slate-700 md:pt-2.5">{label}</label>
      {children}
    </div>
  );
}

/*
 * Renders a physician evaluation (weekly or monthly) from the section config and
 * binds every field to a flat `value` object. Fully themed + responsive.
 *   props: kind ('weekly'|'monthly'), value (fields obj), onChange(nextFields)
 */
export default function EvaluationForm({ kind, value, onChange, readOnly = false }) {
  // Saved view: clean summary of only the filled/selected fields.
  if (readOnly) return <EvaluationSummary kind={kind} value={value || {}} />;

  const set = (name, v) => onChange({ ...value, [name]: v });
  const sections = sectionsFor(kind);

  return (
    <div className="space-y-4">
      {sections.map((sec) => (
        <section key={sec.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-extrabold text-[#123B5D]">{sec.title}</h2>

          {sec.items.map((it, idx) => {
            if (it.t === 'sub') return <p key={idx} className="mt-3 text-xs font-bold uppercase tracking-wide text-[#087E8B]">{it.label}</p>;

            if (it.t === 'ta') return (
              <Field key={it.name} label={it.label}>
                <textarea className={taCls} disabled={readOnly} placeholder={it.placeholder || ''}
                  value={value[it.name] ?? ''} onChange={(e) => set(it.name, e.target.value)} />
              </Field>
            );

            if (it.t === 'access') {
              const picked = value[it.name];
              return (
                <div key={it.name} className="py-2">
                  <p className="mb-2 text-xs text-slate-500">Select one vascular access type to show its assessment.</p>
                  <div className="flex flex-wrap gap-2">
                    {ACCESS_OPTIONS.map((o) => (
                      <label key={o.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${picked === o.value ? 'border-[#123B5D] bg-[#123B5D]/5 text-[#123B5D]' : 'border-slate-300 text-slate-600'}`}>
                        <input type="radio" name={it.name} disabled={readOnly} checked={picked === o.value} onChange={() => set(it.name, o.value)} className="accent-[#123B5D]" />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  {['permacath', 'fistula', 'graft'].map((acc) => {
                    if (picked !== acc) return null;
                    const d = it.details[acc];
                    return (
                      <Field key={acc} label={d.label}>
                        <textarea className={taCls} disabled={readOnly} value={value[d.name] ?? ''} onChange={(e) => set(d.name, e.target.value)} />
                      </Field>
                    );
                  })}
                </div>
              );
            }

            if (it.t === 'struct') return (
              <div key={it.title} className="my-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <h3 className="mb-2.5 text-sm font-bold text-[#123B5D]">{it.title}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {it.grid.map((g) => (
                    <label key={g.name} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                      {g.label}
                      <input type={g.type} disabled={readOnly} placeholder={g.placeholder || ''} className={miniCls}
                        value={value[g.name] ?? ''} onChange={(e) => set(g.name, e.target.value)} />
                    </label>
                  ))}
                </div>
                {it.comments && (
                  <label className="mt-3 flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                    {it.comments.label}
                    <textarea className={taCls} disabled={readOnly} placeholder={it.comments.placeholder || ''}
                      value={value[it.comments.name] ?? ''} onChange={(e) => set(it.comments.name, e.target.value)} />
                  </label>
                )}
              </div>
            );

            if (it.t === 'vaccines') return (
              <div key={`vacc-${it.prefix}`} className="my-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <h3 className="mb-1 text-sm font-bold text-[#123B5D]">Vaccination Record</h3>
                <p className="mb-2.5 text-xs text-slate-500">Check only vaccines confirmed as given; enter date and interval where relevant.</p>
                <div className="space-y-2.5">
                  {VACCINES.map((v) => {
                    const g = `${it.prefix}_vaccine_${v.key}_given`;
                    return (
                      <div key={v.key} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input type="checkbox" disabled={readOnly} checked={!!value[g]} onChange={(e) => set(g, e.target.checked)} className="h-4 w-4 accent-[#123B5D]" />
                          {v.label} — Given
                        </label>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input type="date" disabled={readOnly} className={miniCls} value={value[`${it.prefix}_vaccine_${v.key}_date`] ?? ''} onChange={(e) => set(`${it.prefix}_vaccine_${v.key}_date`, e.target.value)} />
                          <input type="text" disabled={readOnly} placeholder="Duration / Interval / Dose" className={miniCls} value={value[`${it.prefix}_vaccine_${v.key}_duration`] ?? ''} onChange={(e) => set(`${it.prefix}_vaccine_${v.key}_duration`, e.target.value)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );

            if (it.t === 'cvtests') return (
              <div key={`cv-${it.prefix}`} className="my-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <h3 className="mb-2.5 text-sm font-bold text-[#123B5D]">Cardiovascular Care — Tests</h3>
                {[['echocardiogram', 'Echocardiogram (Echo) — Done'], ['stress_test', 'Cardiac Stress Test — Done']].map(([key, lbl]) => (
                  <div key={key} className="mb-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" disabled={readOnly} checked={!!value[`${it.prefix}_${key}_done`]} onChange={(e) => set(`${it.prefix}_${key}_done`, e.target.checked)} className="h-4 w-4 accent-[#123B5D]" />
                      {lbl}
                    </label>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input type="date" disabled={readOnly} className={miniCls} value={value[`${it.prefix}_${key}_date`] ?? ''} onChange={(e) => set(`${it.prefix}_${key}_date`, e.target.value)} />
                      <input type="text" disabled={readOnly} placeholder="Findings / Comments" className={miniCls} value={value[`${it.prefix}_${key}_comments`] ?? ''} onChange={(e) => set(`${it.prefix}_${key}_comments`, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            );

            return null;
          })}
        </section>
      ))}
    </div>
  );
}
