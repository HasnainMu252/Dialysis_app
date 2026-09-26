import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SECTIONS, MINI } from './cannulationData';

/**
 * Nurse / Technician Entry Flow
 *
 * Step 1 — Cannulation Instructions
 * Step 2 — Select Days
 * Step 3 — Select Shift
 * Step 4 — Workflow
 */
export default function NurseEntryFlow({ onDone }) {
  const navigate = useNavigate();

  const [step, setStep] = useState('instruction');
  const [days, setDays] = useState('');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const bodyRef = useRef(null);

  const goWorkflow = (params = {}) => {
    const qs = new URLSearchParams(params).toString();

    onDone?.();

    navigate(qs ? `/workflow?${qs}` : '/workflow');
  };

  const skipAll = () => goWorkflow({});

  useEffect(() => {
    if (step === 'instruction') {
      setScrolledToEnd(false);

      requestAnimationFrame(() => {
        if (bodyRef.current) {
          bodyRef.current.scrollTop = 0;
        }
      });
    }
  }, [step]);

  const onBodyScroll = () => {
    if (scrolledToEnd) return;

    const el = bodyRef.current;
    if (!el) return;

    const remaining =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    if (remaining < 60) {
      setScrolledToEnd(true);
    }
  };

  /**
   * FULL SCREEN PAGE
   */
  const Page = ({ children, footer, header }) => (
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="shrink-0">
        {header}
      </div>

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-hidden">
        {children}
      </main>

      {/* Footer */}
      {footer && (
        <div className="shrink-0">
          {footer}
        </div>
      )}
    </div>
  );

  /* =========================================================
     STEP 1 — CANNULATION INSTRUCTIONS
     ========================================================= */

  if (step === 'instruction') {
    return (
      <Page
        header={
          <div className="flex min-h-[72px] w-full items-center justify-between bg-gradient-to-r from-rose-700 to-red-600 px-4 py-4 text-white sm:px-8 lg:px-10">
            <div>
              <h1 className="text-lg font-black sm:text-xl lg:text-2xl">
                AVF Cannulation Instruction
              </h1>

              <p className="mt-1 text-xs font-medium text-white/75 sm:text-sm">
                Mandatory review before starting dialysis
              </p>
            </div>

            <button
              onClick={skipAll}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold transition hover:bg-white/25"
            >
              Skip
            </button>
          </div>
        }

        footer={
          <div className="flex min-h-[76px] w-full items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-8 lg:px-10">
            <span
              className={`text-xs font-semibold sm:text-sm ${
                scrolledToEnd
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              {scrolledToEnd
                ? '✓ Instruction reviewed'
                : 'Scroll to the end to continue'}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={skipAll}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 sm:px-6"
              >
                Skip
              </button>

              <button
                disabled={!scrolledToEnd}
                onClick={() => setStep('days')}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-8"
              >
                Next →
              </button>
            </div>
          </div>
        }
      >
        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          className="h-full w-full overflow-y-auto bg-slate-50 px-4 py-5 sm:px-8 lg:px-10 lg:py-8"
        >
          {/* FULL WIDTH CONTENT */}
          <div className="w-full">
            <div className="mb-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm lg:p-6">
              <p className="text-sm leading-6 text-slate-600 lg:text-base">
                Laminated AVF Cannulation Instruction
                (Dialysis Unit – 2026 Standard).
                Chairside reference for nurses and technicians
                performing AV fistula cannulation.
                Read fully before starting dialysis.
              </p>
            </div>

            {/* Sections */}
            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {SECTIONS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-black text-rose-700">
                      {s.n}
                    </div>

                    <h3 className="pt-1 text-base font-bold text-slate-900 lg:text-lg">
                      {s.title}
                    </h3>
                  </div>

                  <ul className="space-y-2.5">
                    {s.items.map((it, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm leading-5 text-slate-700"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />

                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* MINI CHECKLIST */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <h3 className="mb-4 text-lg font-black text-slate-900">
                9. Quick Mini-Checklist
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {MINI.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-[10px] font-bold text-emerald-600">
                      ✓
                    </span>

                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* scroll bottom helper */}
            <div className="h-6" />
          </div>
        </div>
      </Page>
    );
  }

  /* =========================================================
     STEP 2 — SELECT DAYS
     ========================================================= */

 if (step === 'days') {
  const DAY_GROUPS = [
    {
      id: 'mwf',
      short: 'MWF',
      days: ['Mon', 'Wed', 'Fri'],
      title: 'Monday / Wednesday / Friday',
      description: '3 dialysis sessions per week',
      card:
        'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/60 hover:border-indigo-400',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-700',
      badge: 'bg-indigo-600 text-white',
      chip: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    },
    {
      id: 'tts',
      short: 'TTS',
      days: ['Tue', 'Thu', 'Sat'],
      title: 'Tuesday / Thursday / Saturday',
      description: '3 dialysis sessions per week',
      card:
        'border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50/60 hover:border-teal-400',
      iconBg: 'bg-teal-100',
      iconText: 'text-teal-700',
      badge: 'bg-teal-600 text-white',
      chip: 'border-teal-200 bg-teal-50 text-teal-700',
    },
  ];

  return (
    <Page
      header={
        <div className="flex min-h-[68px] w-full items-center justify-between bg-slate-950 px-4 py-3 text-white sm:min-h-[76px] sm:px-6 lg:px-10">
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
              Dialysis Schedule
            </p>

            <h1 className="truncate text-lg font-black sm:text-xl lg:text-2xl">
              Select Dialysis Days
            </h1>
          </div>

          <button
            onClick={skipAll}
            className="ml-3 shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 sm:px-4 sm:text-sm"
          >
            Skip
          </button>
        </div>
      }
    >
      <div className="flex h-full w-full overflow-y-auto bg-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          
          {/* Heading */}
          <div className="mb-5 text-center sm:mb-7">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:h-12 sm:w-12">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-slate-700 sm:h-6 sm:w-6"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-black text-slate-900 sm:text-2xl lg:text-3xl">
              Choose Patient Schedule
            </h2>

            <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">
              Select the dialysis day group to show the correct patient
              schedule.
            </p>
          </div>

          {/* Cards */}
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            {DAY_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setDays(group.id);
                  setStep('shift');
                }}
                className={`
                  group relative overflow-hidden rounded-3xl border-2
                  p-5 text-left shadow-sm transition-all duration-200
                  hover:-translate-y-1 hover:shadow-xl
                  active:translate-y-0
                  sm:p-6
                  lg:p-7
                  ${group.card}
                `}
              >
                {/* decorative glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/60 blur-2xl" />

                <div className="relative flex h-full flex-col">
                  
                  {/* Top */}
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${group.iconBg}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`h-5 w-5 sm:h-6 sm:w-6 ${group.iconText}`}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"
                        />
                      </svg>
                    </div>

                    <span
                      className={`rounded-xl px-3 py-1.5 text-xs font-black tracking-wide shadow-sm sm:text-sm ${group.badge}`}
                    >
                      {group.short}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="mt-5">
                    <h3 className="text-base font-black text-slate-900 sm:text-lg lg:text-xl">
                      {group.title}
                    </h3>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                      {group.description}
                    </p>
                  </div>

                  {/* Small day buttons */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {group.days.map((day) => (
                      <span
                        key={day}
                        className={`
                          min-w-[58px] rounded-xl border px-3 py-2
                          text-center text-xs font-bold
                          sm:min-w-[64px] sm:text-sm
                          ${group.chip}
                        `}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Bottom */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-200/70 pt-4">
                    <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                      Select schedule
                    </span>

                    <span
                      className={`
                        flex h-9 w-9 items-center justify-center rounded-xl
                        transition-transform duration-200
                        group-hover:translate-x-1
                        ${group.iconBg} ${group.iconText}
                      `}
                    >
                      →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Help note */}
          <div className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-[11px] text-slate-400 sm:mt-7 sm:text-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
              i
            </span>
            Choose the schedule assigned to the patient.
          </div>
        </div>
      </div>
    </Page>
  );
}
  /* =========================================================
     STEP 3 — SELECT SHIFT
     ========================================================= */

  const SHIFTS = [
  {
    id: '1',
    label: '1st Shift',
    time: '05:00 - 08:00',
    short: 'Morning',
    description: 'Early morning dialysis session',
    card:
      'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 hover:border-amber-400',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    badge: 'bg-amber-500 text-white',
  },
  {
    id: '2',
    label: '2nd Shift',
    time: '09:00 - 12:00',
    short: 'Midday',
    description: 'Late morning dialysis session',
    card:
      'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/60 hover:border-sky-400',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-700',
    badge: 'bg-sky-600 text-white',
  },
  {
    id: '3',
    label: '3rd Shift',
    time: '12:30 - 16:00',
    short: 'Afternoon',
    description: 'Afternoon dialysis session',
    card:
      'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50/60 hover:border-violet-400',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700',
    badge: 'bg-violet-600 text-white',
  },
];

return (
  <Page
    header={
      <div className="flex min-h-[68px] w-full items-center justify-between bg-slate-950 px-4 py-3 text-white sm:min-h-[76px] sm:px-6 lg:px-10">
        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
            Dialysis Schedule
          </p>

          <h1 className="truncate text-lg font-black sm:text-xl lg:text-2xl">
            Select Dialysis Shift
          </h1>

          <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
            {days === 'tts'
              ? 'Tuesday / Thursday / Saturday'
              : 'Monday / Wednesday / Friday'}
          </p>
        </div>

        <button
          onClick={skipAll}
          className="ml-3 shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20 sm:px-4 sm:text-sm"
        >
          Skip
        </button>
      </div>
    }
    footer={
      <div className="flex min-h-[64px] items-center justify-center border-t border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => setStep('days')}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:text-sm"
        >
          <span>←</span>
          Back to Days
        </button>
      </div>
    }
  >
    <div className="flex h-full w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">

        {/* Heading */}
        <div className="mb-5 text-center sm:mb-7">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:h-12 sm:w-12">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-slate-700 sm:h-6 sm:w-6"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="8" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7v5l3 2"
              />
            </svg>
          </div>

          <h2 className="text-xl font-black text-slate-900 sm:text-2xl lg:text-3xl">
            Choose Treatment Shift
          </h2>

          <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">
            Select the patient's assigned dialysis shift to continue to the
            treatment workflow.
          </p>
        </div>

        {/* Selected Days */}
        <div className="mx-auto mb-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 sm:text-xs">
            Selected Days
          </span>

          <span className="h-4 w-px bg-slate-200" />

          <span className="text-xs font-black text-slate-700 sm:text-sm">
            {days === 'tts' ? 'Tue / Thu / Sat' : 'Mon / Wed / Fri'}
          </span>
        </div>

        {/* Shift Cards */}
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {SHIFTS.map((sh) => (
            <button
              key={sh.id}
              onClick={() =>
                goWorkflow({
                  dayPattern: days,
                  shift: sh.id,
                })
              }
              className={`
                group relative overflow-hidden rounded-3xl border-2
                p-5 text-left shadow-sm transition-all duration-200
                hover:-translate-y-1 hover:shadow-xl
                active:translate-y-0
                sm:p-6
                ${sh.card}
              `}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/60 blur-2xl" />

              <div className="relative flex h-full flex-col">
                {/* Top */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${sh.iconBg}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`h-5 w-5 sm:h-6 sm:w-6 ${sh.iconText}`}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 7v5l3 2"
                      />
                    </svg>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow-sm sm:text-xs ${sh.badge}`}
                  >
                    {sh.short}
                  </span>
                </div>

                {/* Main */}
                <div className="mt-5">
                  <h3 className="text-lg font-black text-slate-900 sm:text-xl lg:text-2xl">
                    {sh.label}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    {sh.description}
                  </p>
                </div>

                {/* Time */}
                <div className="mt-5">
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold sm:text-sm ${sh.iconBg} ${sh.iconText}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 7v5l3 2"
                      />
                    </svg>

                    {sh.time}
                  </span>
                </div>

                {/* Bottom */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-200/70 pt-4">
                  <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Select shift
                  </span>

                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:translate-x-1 ${sh.iconBg} ${sh.iconText}`}
                  >
                    →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Hint */}
        <p className="mt-5 text-center text-[11px] text-slate-400 sm:mt-7 sm:text-xs">
          Patient list will be filtered automatically by selected days and shift.
        </p>
      </div>
    </div>
  </Page>
);
}