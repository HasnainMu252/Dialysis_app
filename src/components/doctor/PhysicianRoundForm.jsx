import { ROUND_SECTIONS, ROUND_TEMPLATES, TEMPLATE_NAMES } from '../../constants/physicianRound';

/**
 * Controlled structured round form.
 * value = { physicianRound, doctorComments, socialWorkerComments, dietitianComments, cqi, templateUsed }
 */
export default function PhysicianRoundForm({ value, onChange, showComments = true, showCqi = true, hiddenSections = [] }) {
  const pr = value.physicianRound || {};

  const setSectionField = (sectionKey, fieldKey, fieldValue) => {
    onChange({
      ...value,
      physicianRound: {
        ...pr,
        [sectionKey]: { ...(pr[sectionKey] || {}), [fieldKey]: fieldValue },
      },
    });
  };

  const applyTemplate = (name) => {
    if (!name) return;
    const tpl = ROUND_TEMPLATES[name];
    if (!tpl) return;
    const merged = { ...pr };
    Object.entries(tpl.physicianRound || {}).forEach(([sk, fields]) => {
      merged[sk] = { ...(merged[sk] || {}), ...fields };
    });
    onChange({
      ...value,
      physicianRound: merged,
      doctorComments: tpl.doctorComments || value.doctorComments,
      templateUsed: name,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-blue-50/50 p-4">
        <div>
          <label className="label">Default Template (auto-fills the form)</label>
          <select className="input" value={value.templateUsed || ''} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Select a template…</option>
            {TEMPLATE_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <p className="text-xs font-medium text-slate-500">Pick a template, then edit only what's needed.</p>
      </div>

      {ROUND_SECTIONS.filter((section) => !hiddenSections.includes(section.key)).map((section) => (
        <div key={section.key} className="rounded-2xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-blue-800">{section.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.fields.map((field) => {
              const current = pr[section.key]?.[field.key];
              if (field.type === 'check') {
                return (
                  <label key={field.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-sm">
                    <input type="checkbox" checked={!!current} onChange={(e) => setSectionField(section.key, field.key, e.target.checked)} />
                    {field.label}
                  </label>
                );
              }
              if (field.type === 'select') {
                return (
                  <div key={field.key}>
                    <label className="label">{field.label}</label>
                    <select className="input" value={current || ''} onChange={(e) => setSectionField(section.key, field.key, e.target.value)}>
                      <option value="">—</option>
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              }
              return (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input className="input" value={current || ''} onChange={(e) => setSectionField(section.key, field.key, e.target.value)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showComments && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-blue-800">Comments</h4>
          <div className="grid gap-3 lg:grid-cols-3">
            <div><label className="label">Doctor Comments</label><textarea className="input min-h-24" value={value.doctorComments || ''} onChange={(e) => onChange({ ...value, doctorComments: e.target.value })} /></div>
            <div><label className="label">Social Worker Comments</label><textarea className="input min-h-24" value={value.socialWorkerComments || ''} onChange={(e) => onChange({ ...value, socialWorkerComments: e.target.value })} /></div>
            <div><label className="label">Dietitian Comments</label><textarea className="input min-h-24" value={value.dietitianComments || ''} onChange={(e) => onChange({ ...value, dietitianComments: e.target.value })} /></div>
          </div>
        </div>
      )}

      {showCqi && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-blue-800">CQI</h4>
          <div className="grid gap-3 lg:grid-cols-3">
            <div><label className="label">Patient CQI</label><textarea className="input min-h-20" value={value.cqi?.patient || ''} onChange={(e) => onChange({ ...value, cqi: { ...(value.cqi || {}), patient: e.target.value } })} /></div>
            <div><label className="label">Social CQI</label><textarea className="input min-h-20" value={value.cqi?.social || ''} onChange={(e) => onChange({ ...value, cqi: { ...(value.cqi || {}), social: e.target.value } })} /></div>
            <div><label className="label">Dietitian CQI</label><textarea className="input min-h-20" value={value.cqi?.dietitian || ''} onChange={(e) => onChange({ ...value, cqi: { ...(value.cqi || {}), dietitian: e.target.value } })} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
