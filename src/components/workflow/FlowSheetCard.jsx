import { useEffect, useMemo, useState } from 'react';
import { toDateInput } from '../../utils/accessAge';

/*
 * Treatment flow sheet — machine checks, solution mixing, access list and
 * access assessment. Entry surface for technicians/nurses during dialysis;
 * renders read-only once the session is completed or for roles that can't edit.
 * Mirrors the paper flow sheet the clinic uses.
 */

const PASS_FAIL = ['', 'Pass', 'Fail'];
const YES_NO = ['', 'Yes', 'No'];

const BLANK_ACCESS_LINE = {
  inUse: false,
  type: '',
  site: '',
  placementDate: '',
  surgeon: '',
  arterialSide: '',
  infiltrations: '',
  bloodFlowRate: '',
  accessWashed: '',
  patientHandsWashed: '',
  catheterVerification: '',
};

// Structured access evaluation — checklist items depend on the access type.
const EVAL_TYPES = [
  { value: '', label: 'Select access type…' },
  { value: 'permacath', label: 'Permacath' },
  { value: 'av_fistula', label: 'AV Fistula' },
  { value: 'av_graft', label: 'AV Graft' },
];
const EVAL_ITEMS = {
  permacath: [
    ['permacath_noInfection', 'No local infection'],
    ['permacath_noDischarge', 'No discharge at / around the catheter'],
    ['permacath_dressingClean', 'Dressing — no skin infection'],
  ],
  av_fistula: [
    ['fistula_noInfection', 'Needle puncture site — no infection'],
    ['fistula_noPseudoaneurysm', 'No pseudoaneurysm needing surgical attention'],
    ['fistula_noUlceration', 'No ulceration with risk of rupture'],
    ['fistula_warmCirculation', 'Warm distal circulation, no steal'],
    ['fistula_noDeficit', 'No motor or sensory deficit'],
  ],
  av_graft: [
    ['graft_noSteal', 'No steal noted'],
    ['graft_goodBruit', 'Good bruit'],
    ['graft_mature', 'Mature, no surrounding edema'],
  ],
};

// Seed the access list from the patient's bio-level fistula/catheter so the
// nurse doesn't re-enter it; it stays fully editable on the flow sheet.
function seedAccessFromPatient(patient) {
  const va = patient?.vascularAccess || {};
  const lines = [];
  const add = (src, fallbackType) => {
    if (!src) return;
    if (!(src.present || src.type || src.site || src.placementDate)) return;
    lines.push({
      ...BLANK_ACCESS_LINE,
      inUse: !!src.present,
      type: src.type || fallbackType,
      site: src.site || '',
      placementDate: toDateInput(src.placementDate),
    });
  };
  add(va.fistula, 'AV Fistula');
  add(va.catheter, 'Catheter');
  return lines;
}

const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500';

function Field({ label: lbl, value, onChange, disabled, type = 'text', placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{lbl}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function Select({ label: lbl, value, onChange, disabled, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{lbl}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
      {children}
    </h4>
  );
}

function normalize(flowSheet, patient) {
  const fs = flowSheet || {};
  const existing = (fs.accessList || []).map((a) => ({
    ...BLANK_ACCESS_LINE,
    ...a,
    placementDate: toDateInput(a.placementDate),
  }));
  const ev = fs.accessEvaluation || {};
  return {
    machineCheck: { ...(fs.machineCheck || {}) },
    solutionMixing: {
      correctSolutionVerified: false,
      ...(fs.solutionMixing || {}),
    },
    accessAssessment: { ...(fs.accessAssessment || {}) },
    accessEvaluation: { type: ev.type || '', checks: { ...(ev.checks || {}) }, note: ev.note || '' },
    // Seed from the patient's bio access when the session has none yet.
    accessList: existing.length ? existing : seedAccessFromPatient(patient),
  };
}

export default function FlowSheetCard({ session, onSave, saving, canEdit = true }) {
  const initial = useMemo(() => normalize(session?.flowSheet, session?.patient), [session?._id]);
  const [form, setForm] = useState(initial);

  // Re-sync when the selected session changes or is refreshed after save.
  useEffect(() => {
    setForm(normalize(session?.flowSheet, session?.patient));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id, session?.flowSheet?.updatedAt]);

  const mc = (k, v) => setForm((f) => ({ ...f, machineCheck: { ...f.machineCheck, [k]: v } }));
  const sm = (k, v) => setForm((f) => ({ ...f, solutionMixing: { ...f.solutionMixing, [k]: v } }));
  const aa = (k, v) => setForm((f) => ({ ...f, accessAssessment: { ...f.accessAssessment, [k]: v } }));
  const aeType = (v) => setForm((f) => ({ ...f, accessEvaluation: { ...f.accessEvaluation, type: v } }));
  const aeCheck = (k, v) => setForm((f) => ({ ...f, accessEvaluation: { ...f.accessEvaluation, checks: { ...f.accessEvaluation.checks, [k]: v } } }));
  const aeNote = (v) => setForm((f) => ({ ...f, accessEvaluation: { ...f.accessEvaluation, note: v } }));

  const setAccess = (i, k, v) =>
    setForm((f) => ({
      ...f,
      accessList: f.accessList.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    }));
  const addAccess = () =>
    setForm((f) => ({ ...f, accessList: [...f.accessList, { ...BLANK_ACCESS_LINE }] }));
  const removeAccess = (i) =>
    setForm((f) => ({ ...f, accessList: f.accessList.filter((_, idx) => idx !== i) }));

  const disabled = !canEdit || saving;

  const updatedLine = session?.flowSheet?.updatedByName
    ? `Last updated by ${session.flowSheet.updatedByName}${
        session.flowSheet.updatedByRole ? ` (${session.flowSheet.updatedByRole})` : ''
      }`
    : null;

  const handleSave = () => {
    onSave?.({
      machineCheck: form.machineCheck,
      solutionMixing: form.solutionMixing,
      accessAssessment: form.accessAssessment,
      accessEvaluation: form.accessEvaluation,
      accessList: form.accessList.map((a) => ({
        ...a,
        placementDate: a.placementDate || undefined,
      })),
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Flow Sheet</h3>
          <p className="text-xs text-slate-500">
            Machine checks, solution mixing, access list and assessment.
          </p>
        </div>
        {updatedLine && <span className="text-xs text-slate-400">{updatedLine}</span>}
      </div>

      {/* Machine checks */}
      <section className="mb-6">
        <SectionTitle>Machine Checks</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dicap Filter Hours Remaining" value={form.machineCheck.dicapFilterHoursRemaining} onChange={(v) => mc('dicapFilterHoursRemaining', v)} disabled={disabled} />
          <Field label="Conductivity (Machine)" value={form.machineCheck.conductivityMachine} onChange={(v) => mc('conductivityMachine', v)} disabled={disabled} />
          <Field label="Conductivity (Meter)" value={form.machineCheck.conductivityMeter} onChange={(v) => mc('conductivityMeter', v)} disabled={disabled} />
          <Field label="Temperature" value={form.machineCheck.temperature} onChange={(v) => mc('temperature', v)} disabled={disabled} />
          <Field label="pH" value={form.machineCheck.ph} onChange={(v) => mc('ph', v)} disabled={disabled} />
          <Select label="Alarm Test" value={form.machineCheck.alarmTest} onChange={(v) => mc('alarmTest', v)} disabled={disabled} options={PASS_FAIL} />
          <Select label="Air Detector" value={form.machineCheck.airDetector} onChange={(v) => mc('airDetector', v)} disabled={disabled} options={PASS_FAIL} />
          <Select label="Pressure Test (Machine)" value={form.machineCheck.pressureTestMachine} onChange={(v) => mc('pressureTestMachine', v)} disabled={disabled} options={PASS_FAIL} />
          <Select label="Pressure Check (Dialyzer)" value={form.machineCheck.pressureCheckDialyzer} onChange={(v) => mc('pressureCheckDialyzer', v)} disabled={disabled} options={PASS_FAIL} />
        </div>
      </section>

      {/* Solution mixing */}
      <section className="mb-6">
        <SectionTitle>Solution Mixing</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dialysis Water" value={form.solutionMixing.dialysisWater} onChange={(v) => sm('dialysisWater', v)} disabled={disabled} />
          <Field label="Bicarbonate" value={form.solutionMixing.bicarbonate} onChange={(v) => sm('bicarbonate', v)} disabled={disabled} />
          <Field label="Solution Mixing" value={form.solutionMixing.mixing} onChange={(v) => sm('mixing', v)} disabled={disabled} />
          <Field label="Temperature" value={form.solutionMixing.temperature} onChange={(v) => sm('temperature', v)} disabled={disabled} />
          <Field label="Note" value={form.solutionMixing.note} onChange={(v) => sm('note', v)} disabled={disabled} />
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={!!form.solutionMixing.correctSolutionVerified}
              onChange={(e) => sm('correctSolutionVerified', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Correct solution verified</span>
          </label>
        </div>
      </section>

      {/* Access list */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Access List</h4>
          {canEdit && (
            <button type="button" onClick={addAccess} disabled={disabled} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">
              + Add access
            </button>
          )}
        </div>

        {form.accessList.length === 0 && (
          <p className="text-sm text-slate-400">No access recorded yet.</p>
        )}

        <div className="space-y-4">
          {form.accessList.map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!row.inUse}
                    onChange={(e) => setAccess(i, 'inUse', e.target.checked)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Access in use</span>
                </label>
                {canEdit && (
                  <button type="button" onClick={() => removeAccess(i)} disabled={disabled} className="text-xs font-bold text-red-600 transition hover:text-red-700 disabled:opacity-50">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Type" value={row.type} onChange={(v) => setAccess(i, 'type', v)} disabled={disabled} placeholder="AV Fistula" />
                <Field label="Site" value={row.site} onChange={(v) => setAccess(i, 'site', v)} disabled={disabled} placeholder="Left Upper Arm" />
                <Field label="Placement Date" type="date" value={row.placementDate} onChange={(v) => setAccess(i, 'placementDate', v)} disabled={disabled} />
                <Field label="Surgeon" value={row.surgeon} onChange={(v) => setAccess(i, 'surgeon', v)} disabled={disabled} />
                <Field label="Arterial Side" value={row.arterialSide} onChange={(v) => setAccess(i, 'arterialSide', v)} disabled={disabled} />
                <Field label="Blood Flow Rate" value={row.bloodFlowRate} onChange={(v) => setAccess(i, 'bloodFlowRate', v)} disabled={disabled} />
                <Field label="Infiltrations" value={row.infiltrations} onChange={(v) => setAccess(i, 'infiltrations', v)} disabled={disabled} />
                <Select label="Access Washed" value={row.accessWashed} onChange={(v) => setAccess(i, 'accessWashed', v)} disabled={disabled} options={YES_NO} />
                <Select label="Patient Hands Washed" value={row.patientHandsWashed} onChange={(v) => setAccess(i, 'patientHandsWashed', v)} disabled={disabled} options={YES_NO} />
                <Field label="Catheter Verification" value={row.catheterVerification} onChange={(v) => setAccess(i, 'catheterVerification', v)} disabled={disabled} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Access assessment */}
      <section className="mb-5">
        <SectionTitle>Access Assessment</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Access Evaluation Time" value={form.accessAssessment.evaluationTime} onChange={(v) => aa('evaluationTime', v)} disabled={disabled} placeholder="05:16" />
          <Select label="Bruit" value={form.accessAssessment.bruit} onChange={(v) => aa('bruit', v)} disabled={disabled} options={YES_NO} />
          <Select label="Thrill" value={form.accessAssessment.thrill} onChange={(v) => aa('thrill', v)} disabled={disabled} options={YES_NO} />
          <Field label="Extremity Swelling" value={form.accessAssessment.extremitySwelling} onChange={(v) => aa('extremitySwelling', v)} disabled={disabled} placeholder="None" />
          <Field label="Dressing Changed" value={form.accessAssessment.dressingChanged} onChange={(v) => aa('dressingChanged', v)} disabled={disabled} />
          <Select label="Signs of Soft Tissue Infection" value={form.accessAssessment.softTissueInfection} onChange={(v) => aa('softTissueInfection', v)} disabled={disabled} options={YES_NO} />
          <Select label="Access-Related Infection w/ Bacteremia" value={form.accessAssessment.accessInfectionBacteremia} onChange={(v) => aa('accessInfectionBacteremia', v)} disabled={disabled} options={YES_NO} />
        </div>
      </section>

      {/* Access evaluation — type-dependent Yes/No checklist */}
      <section className="mb-5">
        <SectionTitle>Access Evaluation</SectionTitle>
        <label className="mb-3 flex max-w-xs flex-col gap-1">
          <span className={label}>Access type</span>
          <select value={form.accessEvaluation.type} onChange={(e) => aeType(e.target.value)} disabled={disabled} className={inputCls}>
            {EVAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        {form.accessEvaluation.type && EVAL_ITEMS[form.accessEvaluation.type] ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {EVAL_ITEMS[form.accessEvaluation.type].map(([key, text]) => (
              <label key={key} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.accessEvaluation.checks[key]}
                  onChange={(e) => aeCheck(key, e.target.checked)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{text}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Pick an access type to show its evaluation checklist.</p>
        )}
        <div className="mt-3">
          <Field label="Evaluation note" value={form.accessEvaluation.note} onChange={aeNote} disabled={disabled} />
        </div>
      </section>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save flow sheet'}
          </button>
        </div>
      )}
    </div>
  );
}
