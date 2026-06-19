export function Input({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextField({ label, type = 'text', value, onChange, placeholder, hint, required }) {
  return (
    <Input label={label} hint={hint}>
      <input
        className="input"
        type={type}
        value={value || ''}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Input>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, className = 'min-h-24' }) {
  return (
    <div className="md:col-span-3">
      <label className="label">{label}</label>
      <textarea className={`input ${className}`} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, labels }) {
  return (
    <Input label={label}>
      <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option value={opt} key={opt}>{labels?.[opt] || opt || 'select'}</option>
        ))}
      </select>
    </Input>
  );
}

export function YesNo({ label, value, onChange }) {
  const bool = value === true || value === 'true';
  return (
    <Input label={label}>
      <select className="input" value={String(bool)} onChange={(e) => onChange(e.target.value === 'true')}>
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    </Input>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}