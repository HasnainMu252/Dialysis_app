import { useNavigate } from 'react-router-dom';
import Azuza from '../../Assets/Azuza.png';

const ROLE_BOXES = [
  {
    role: 'admin',
    label: 'Admin',
    desc: 'System settings, users & administration',
    icon: 'AD',
    card: 'from-slate-50 via-white to-slate-100',
    iconBg: 'from-slate-700 to-slate-900',
    border: 'hover:border-slate-400',
    text: 'text-slate-700',
    shadow: 'hover:shadow-slate-200',
  },
  {
    role: 'front_desk',
    label: 'Front Desk',
    desc: 'Patient registration & scheduling',
    icon: 'FD',
    card: 'from-blue-50 via-white to-indigo-50',
    iconBg: 'from-blue-500 to-indigo-600',
    border: 'hover:border-blue-400',
    text: 'text-blue-600',
    shadow: 'hover:shadow-blue-100',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    desc: 'Rounds, patient review & clinical notes',
    icon: 'DR',
    card: 'from-cyan-50 via-white to-teal-50',
    iconBg: 'from-cyan-500 to-teal-600',
    border: 'hover:border-cyan-400',
    text: 'text-cyan-700',
    shadow: 'hover:shadow-cyan-100',
  },
  {
    role: 'nurse',
    label: 'Nurse',
    desc: 'Patient care & treatment workflow',
    icon: 'NR',
    card: 'from-emerald-50 via-white to-green-50',
    iconBg: 'from-emerald-500 to-green-600',
    border: 'hover:border-emerald-400',
    text: 'text-emerald-700',
    shadow: 'hover:shadow-emerald-100',
  },
  {
    role: 'technician',
    label: 'Technician',
    desc: 'Stations, cannulation & treatment',
    icon: 'TC',
    card: 'from-indigo-50 via-white to-violet-50',
    iconBg: 'from-indigo-500 to-violet-600',
    border: 'hover:border-indigo-400',
    text: 'text-indigo-700',
    shadow: 'hover:shadow-indigo-100',
  },
  {
    role: 'social_worker',
    label: 'Social Worker',
    desc: 'Patient support & follow-up',
    icon: 'SW',
    card: 'from-fuchsia-50 via-white to-purple-50',
    iconBg: 'from-fuchsia-500 to-purple-600',
    border: 'hover:border-fuchsia-400',
    text: 'text-purple-700',
    shadow: 'hover:shadow-purple-100',
  },
  {
    role: 'biller',
    label: 'Biller',
    desc: 'Billing, claims & payment workflow',
    icon: 'BL',
    card: 'from-amber-50 via-white to-orange-50',
    iconBg: 'from-amber-500 to-orange-600',
    border: 'hover:border-amber-400',
    text: 'text-amber-700',
    shadow: 'hover:shadow-amber-100',
  },
  {
    role: 'insurance_person',
    label: 'Insurance',
    desc: 'Coverage, verification & approvals',
    icon: 'IN',
    card: 'from-rose-50 via-white to-red-50',
    iconBg: 'from-rose-500 to-red-600',
    border: 'hover:border-rose-400',
    text: 'text-rose-700',
    shadow: 'hover:shadow-rose-100',
  },
];

export default function RolePicker() {
  const navigate = useNavigate();

  const pick = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div
      className="
        flex
        h-[100dvh]
        w-full
        flex-col
        overflow-hidden
        bg-gradient-to-br
        from-blue-50
        via-white
        to-cyan-50
      "
    >
      {/* ================= HEADER ================= */}

      <header
        className="
          shrink-0
          border-b
          border-indigo-400/30
          bg-[#4C42F3]
        "
      >
        <div
          className="
            flex
            h-[72px]
            w-full
            items-center
            justify-between
            px-5
            sm:px-6
            lg:px-8
          "
        >
          {/* LOGO */}

          <div className="flex items-center">
            <img
              src={Azuza}
              alt="Azusa Dialysis"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* SECURE BADGE */}

          <div
            className="
              hidden
              items-center
              gap-2
              rounded-full
              border
              border-white/25
              bg-white/10
              px-4
              py-2
              backdrop-blur-sm
              md:flex
            "
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />

              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>

            <span className="text-xs font-bold text-white">
              Secure Access
            </span>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main
        className="
          flex
          min-h-0
          flex-1
          flex-col
          px-4
          py-4
          sm:px-6
          lg:px-8
          lg:py-5
        "
      >
        <div
          className="
            mx-auto
            flex
            h-full
            w-full
            max-w-[1500px]
            flex-col
          "
        >
          {/* ================= HERO ================= */}

          <div className="shrink-0 text-center">
            <div
              className="
                mx-auto
                mb-2
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-blue-600
                via-indigo-600
                to-cyan-500
                shadow-lg
                shadow-blue-200
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-white"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <h1
              className="
                bg-gradient-to-r
                from-blue-700
                via-indigo-600
                to-cyan-600
                bg-clip-text
                text-2xl
                font-black
                tracking-tight
                text-transparent
                lg:text-3xl
              "
            >
              Welcome to Azusa Dialysis
            </h1>

            <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
              Choose your role to securely access your dashboard.
            </p>
          </div>

          {/* ================= INFO ================= */}

          <div
            className="
              mx-auto
              mt-3
              flex
              w-full
              max-w-4xl
              shrink-0
              items-center
              gap-3
              rounded-xl
              border
              border-blue-100
              bg-gradient-to-r
              from-blue-50
              via-indigo-50
              to-cyan-50
              px-4
              py-2.5
              shadow-sm
            "
          >
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-gradient-to-br
                from-blue-600
                to-indigo-600
                text-white
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-900 sm:text-sm">
                Select your work role
              </p>

              <p className="text-[11px] text-blue-700 sm:text-xs">
                Your account credentials will be required on the next screen.
              </p>
            </div>
          </div>

          {/* ================= ROLE CARDS ================= */}

          <div
            className="
              mt-4
              grid
              min-h-0
              flex-1
              grid-cols-1
              content-center
              gap-3
              overflow-y-auto
              sm:grid-cols-2
              lg:grid-cols-4
              lg:grid-rows-2
              lg:overflow-hidden
              xl:gap-4
            "
          >
            {ROLE_BOXES.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => pick(item.role)}
                className={`
                  group
                  relative
                  flex
                  min-h-[120px]
                  w-full
                  items-center
                  gap-4
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-gradient-to-br
                  ${item.card}
                  p-4
                  text-left
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-xl
                  ${item.border}
                  ${item.shadow}
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:ring-offset-2
                  lg:min-h-0
                  lg:h-full
                `}
              >
                {/* DECORATIVE CIRCLE */}

                <div
                  className={`
                    absolute
                    -right-8
                    -top-8
                    h-28
                    w-28
                    rounded-full
                    bg-gradient-to-br
                    ${item.iconBg}
                    opacity-[0.07]
                    transition
                    duration-300
                    group-hover:scale-125
                    group-hover:opacity-[0.12]
                  `}
                />

                {/* ICON */}

                <div
                  className={`
                    relative
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    ${item.iconBg}
                    text-base
                    font-black
                    text-white
                    shadow-md
                    transition
                    duration-300
                    group-hover:scale-110
                    group-hover:rotate-2
                  `}
                >
                  {item.icon}
                </div>

                {/* CONTENT */}

                <div className="relative min-w-0 flex-1">
                  <h3 className="text-lg font-black text-slate-900">
                    {item.label}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.desc}
                  </p>

                  <div
                    className={`
                      mt-2
                      flex
                      items-center
                      gap-1
                      text-xs
                      font-extrabold
                      ${item.text}
                    `}
                  >
                    Sign in

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="
                        h-4
                        w-4
                        transition-transform
                        duration-200
                        group-hover:translate-x-1
                      "
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ================= FOOTER ================= */}

          <div
            className="
              mt-3
              flex
              shrink-0
              items-center
              justify-center
              gap-2
              pb-1
              text-center
              text-[11px]
              text-slate-400
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-blue-600"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>

            <span>
              Your verified account role determines dashboard access and permissions.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}