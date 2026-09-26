import { useEffect, useState } from 'react';

const INSTRUCTION_GROUPS = [
  {
    number: '01',
    title: 'Getting Started',
    subtitle: 'Login and open your workspace',
    items: [
      'Login to the system using your assigned username and password.',
      'Review the important instructions before entering the dashboard.',
      'Open your dashboard to view patients, schedules, alerts, and pending tasks.',
    ],
  },
  {
    number: '02',
    title: 'Review Your Dashboard',
    subtitle: "Check today's work before taking action",
    items: [
      "Check today’s patient list and review each patient’s current status.",
      'Review schedules and chair assignments before starting or managing patient activities.',
      'Check alerts and notifications for patients requiring attention or follow-up.',
    ],
  },
  {
    number: '03',
    title: 'Review & Take Action',
    subtitle: 'Review patient information and complete your task',
    items: [
      'Review patient information such as treatment status, notes, vitals, access concerns, or other available details according to your role.',
      'Complete your assigned actions and update the patient status after each task.',
      'Escalate important issues to the Nurse, Doctor, or appropriate staff member when required.',
    ],
  },
  {
    number: '04',
    title: 'Before You Finish',
    subtitle: 'Confirm decisions and documentation',
    items: [
      'Review AI suggestions carefully. AI may provide summaries, alerts, or recommendations based on available patient data.',
      'Make the final decision yourself. Staff decisions always take priority over AI suggestions.',
      'Complete documentation before leaving the patient record so all activities remain properly recorded in the system.',
    ],
  },
];

export default function GeneralInstructionsGate({
  gateKey = 'general',
  onDone,
}) {
  const storageKey =
    'instructionsShown:' +
    gateKey +
    ':' +
    (() => {
      try {
        return localStorage.getItem('token') || '';
      } catch {
        return '';
      }
    })();

  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) !== '1';
    } catch {
      return true;
    }
  });

  /*
   * IMPORTANT:
   * Lock the main website/body scrollbar while
   * this instruction screen is visible.
   */
  useEffect(() => {
    if (!visible) return;

    const oldBodyOverflow = document.body.style.overflow;
    const oldHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldHtmlOverflow;
    };
  }, [visible]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // ignore storage error
    }

    setVisible(false);

    if (onDone) {
      onDone();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[130]
        flex
        h-[100dvh]
        w-full
        flex-col
        overflow-hidden
        bg-slate-50
      "
    >
      {/* ================= HEADER ================= */}

      <header
        className="
          shrink-0
          bg-gradient-to-r
          from-blue-700
          via-blue-600
          to-cyan-600
        "
      >
        <div
          className="
            flex
            w-full
            items-center
            justify-between
            px-4
            py-3
            sm:px-6
            lg:px-8
          "
        >
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white/15
                text-white
                ring-1
                ring-white/20
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>

            <div>
              <h1
                className="
                  text-base
                  font-black
                  leading-tight
                  text-white
                  sm:text-lg
                  lg:text-xl
                "
              >
                General Instructions
              </h1>

              <p className="mt-0.5 text-[11px] text-blue-100 sm:text-xs">
                Review these steps before entering your dashboard
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div
            className="
              hidden
              rounded-xl
              bg-white/10
              px-4
              py-1.5
              text-center
              sm:block
            "
          >
            <p className="text-[9px] font-semibold uppercase text-blue-100">
              Quick Guide
            </p>

            <p className="text-xs font-bold text-white">
              4 Sections • 12 Steps
            </p>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main
        className="
          min-h-0
          flex-1
          overflow-hidden
          px-3
          py-3
          sm:px-4
          lg:px-5
        "
      >
        <div
          className="
            flex
            h-full
            min-h-0
            w-full
            flex-col
            gap-3
          "
        >
          {/* INTRO BAR */}

          <div
            className="
              flex
              shrink-0
              items-center
              justify-between
              gap-4
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              px-4
              py-2
            "
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-900 sm:text-sm">
                Before entering the dashboard
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  leading-4
                  text-blue-700
                  sm:text-xs
                "
              >
                Follow the steps below in sequence to keep patient workflow,
                communication, and documentation complete.
              </p>
            </div>

            <span
              className="
                hidden
                shrink-0
                rounded-full
                bg-blue-600
                px-3
                py-1.5
                text-[10px]
                font-bold
                text-white
                md:block
              "
            >
              Read all 4 sections
            </span>
          </div>

          {/* ================= 4 CARDS ================= */}

          <div
            className="
              grid
              min-h-0
              flex-1
              grid-cols-2
              grid-rows-2
              gap-3
            "
          >
            {INSTRUCTION_GROUPS.map((group, groupIndex) => (
              <section
                key={group.title}
                className="
                  flex
                  min-h-0
                  min-w-0
                  flex-col
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  shadow-sm
                "
              >
                {/* CARD HEADER */}

                <div
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-3
                    border-b
                    border-slate-100
                    bg-slate-50
                    px-3
                    py-2
                    lg:px-4
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-blue-600
                      text-[11px]
                      font-black
                      text-white
                      shadow-sm
                    "
                  >
                    {group.number}
                  </div>

                  <div className="min-w-0">
                    <h2
                      className="
                        truncate
                        text-xs
                        font-extrabold
                        text-slate-900
                        lg:text-sm
                      "
                    >
                      {group.title}
                    </h2>

                    <p
                      className="
                        truncate
                        text-[9px]
                        text-slate-500
                        lg:text-[11px]
                      "
                    >
                      {group.subtitle}
                    </p>
                  </div>
                </div>

                {/* CARD BODY */}

                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    flex-col
                    justify-evenly
                    px-3
                    py-1
                    lg:px-4
                  "
                >
                  {group.items.map((item, itemIndex) => {
                    const currentNumber =
                      groupIndex * 3 + itemIndex + 1;

                    return (
                      <div
                        key={`${group.title}-${itemIndex}`}
                        className="
                          flex
                          min-w-0
                          items-start
                          gap-2.5
                          rounded-lg
                          px-1
                          py-1
                          transition
                          hover:bg-blue-50
                          lg:gap-3
                          lg:px-2
                        "
                      >
                        {/* STEP NUMBER */}

                        <div
                          className="
                            flex
                            h-6
                            w-6
                            shrink-0
                            items-center
                            justify-center
                            rounded-md
                            bg-blue-100
                            text-[10px]
                            font-black
                            text-blue-700
                          "
                        >
                          {currentNumber}
                        </div>

                        {/* TEXT */}

                        <p
                          className="
                            min-w-0
                            text-[10px]
                            font-medium
                            leading-[1.35rem]
                            text-slate-700
                            xl:text-xs
                          "
                        >
                          {item}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* ================= AI REMINDER ================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
              rounded-xl
              border
              border-amber-200
              bg-amber-50
              px-3
              py-1.5
            "
          >
            <div
              className="
                flex
                h-6
                w-6
                shrink-0
                items-center
                justify-center
                rounded-md
                bg-amber-100
                text-xs
                font-black
                text-amber-700
              "
            >
              !
            </div>

            <p
              className="
                text-[9px]
                leading-4
                text-amber-800
                sm:text-[10px]
                lg:text-xs
              "
            >
              <strong>Important:</strong> AI suggestions are supportive only.
              Always review patient information and use professional judgment
              before taking action.
            </p>
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}

      <footer
        className="
          shrink-0
          border-t
          border-slate-200
          bg-white
          shadow-[0_-3px_15px_rgba(15,23,42,0.05)]
        "
      >
        <div
          className="
            flex
            w-full
            items-center
            justify-between
            gap-4
            px-4
            py-2.5
            sm:px-6
            lg:px-8
          "
        >
          {/* REVIEWED */}

          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-emerald-100
                text-sm
                font-bold
                text-emerald-600
              "
            >
              ✓
            </div>

            <div>
              <p className="text-xs font-bold text-emerald-600 sm:text-sm">
                Instructions Reviewed
              </p>

              <p className="hidden text-[10px] text-slate-400 sm:block">
                You can now continue to the dashboard
              </p>
            </div>
          </div>

          {/* BUTTON */}

          <button
            type="button"
            onClick={dismiss}
            className="
              shrink-0
              rounded-xl
              bg-blue-600
              px-5
              py-2.5
              text-xs
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
              active:scale-[0.98]
              sm:px-6
              sm:text-sm
            "
          >
            Continue to Dashboard
            <span className="ml-2">→</span>
          </button>
        </div>
      </footer>
    </div>
  );
}