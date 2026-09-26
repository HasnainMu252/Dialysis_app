import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { roleHome } from '../../constants';
import { useAuth } from '../../context/AuthContext';

import Aegle from '../../Assets/Aegle.png';
import Azuza from '../../Assets/Azuza.png';

const slides = [
  {
    from: 'from-blue-700',
    via: 'via-blue-600',
    to: 'to-cyan-500',
    accent: 'bg-cyan-300',
    title: 'Dialysis Care, Coordinated',
    text: 'Manage schedules, chairs, treatments, medications and patient records from one secure platform.',
  },
  {
    from: 'from-indigo-800',
    via: 'via-indigo-600',
    to: 'to-blue-500',
    accent: 'bg-blue-300',
    title: 'Safer Treatment Workflow',
    text: 'Capture vitals, treatment details, SOAP notes and session history at every chair.',
  },
  {
    from: 'from-cyan-700',
    via: 'via-teal-600',
    to: 'to-emerald-500',
    accent: 'bg-emerald-300',
    title: 'Complete Medication Tracking',
    text: 'Track dialysis medications and home medicines with clear daily and monthly reports.',
  },
  {
    from: 'from-slate-900',
    via: 'via-blue-900',
    to: 'to-blue-600',
    accent: 'bg-blue-300',
    title: 'Designed for Your Entire Team',
    text: 'Secure role-based access for doctors, nurses, technicians, billers and front-desk staff.',
  },
];

/* =========================
   ICONS
========================= */

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M4 6.75h16v10.5H4V6.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m5 8 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5 10h14v10H5V10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9.3 12 1.8 1.8 3.8-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ hidden = false }) {
  return hidden ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="m4 4 16 16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.7a2 2 0 0 0 2.7 2.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.3 5.9A9.5 9.5 0 0 1 12 5c5.2 0 8.5 5.2 8.5 7 0 .8-.7 2.2-2 3.6M6.1 7.1C4.4 8.5 3.5 10.6 3.5 12c0 1.8 3.3 7 8.5 7a9.3 9.3 0 0 0 3.2-.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M3.5 12c0-1.8 3.3-7 8.5-7s8.5 5.2 8.5 7-3.3 7-8.5 7-8.5-5.2-8.5-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="2.6"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m6 12 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================
   LOGIN
========================= */

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    mfaToken: '',
  });

  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [slide, setSlide] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleHint = new URLSearchParams(location.search).get('role');

  const ROLE_LABELS = {
    admin: 'Admin',
    front_desk: 'Front Desk',
    doctor: 'Doctor',
    nurse: 'Nurse',
    technician: 'Technician',
    social_worker: 'Social Worker',
    biller: 'Biller',
    insurance_person: 'Insurance',
    patient: 'Patient',
  };

  const roleHintLabel = roleHint ? ROLE_LABELS[roleHint] : '';

  /* =========================
     SLIDER TIMER
  ========================= */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((currentSlide) => (currentSlide + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  /* =========================
     FORM HANDLERS
  ========================= */

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changeCredentials = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      mfaToken: '',
    }));

    setMfaRequired(false);
  };

  /* =========================
     LOGIN SUBMIT
  ========================= */

  const submit = async (event) => {
    event.preventDefault();

    if (mfaRequired && form.mfaToken.length !== 6) {
      toast.error('Enter a valid 6-digit authenticator code.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(form);

      if (result?.mfaRequired) {
        setMfaRequired(true);

        setForm((current) => ({
          ...current,
          mfaToken: '',
        }));

        toast('Enter your authenticator code to continue.', {
          icon: '🔐',
        });

        return;
      }

      const { user } = result;

      const redirectTo =
        location.state?.from?.pathname ||
        roleHome[user.role] ||
        '/';

      toast.success('Welcome back! Login successful.');

      navigate(redirectTo, {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to sign in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const activeSlide = slides[slide];

  return (
    <main className="fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-hidden bg-slate-950">
      {/* =====================================================
          FULL SCREEN BACKGROUND
      ===================================================== */}

      <section className="absolute inset-0 overflow-hidden">
        {/* Gradient slides */}
        {slides.map((item, index) => (
          <div
            key={item.title}
            className={`
              absolute
              inset-0
              bg-gradient-to-br
              ${item.from}
              ${item.via}
              ${item.to}
              transition-all
              duration-1000
              ${
                index === slide
                  ? 'scale-100 opacity-100'
                  : 'scale-105 opacity-0'
              }
            `}
          />
        ))}

        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Glow */}
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[500px] w-[500px] rounded-full bg-cyan-300/20 blur-3xl" />

        {/* Slight dark overlay */}
        <div className="absolute inset-0 bg-slate-950/10" />

        {/* =====================================================
            LEFT BACKGROUND INFORMATION
        ===================================================== */}

        <div className="relative z-10 hidden h-full w-full lg:block">
          {/* LOGOS */}

          <div className="absolute left-10 top-7">
            <div className="flex items-center gap-5 rounded-2xl bg-black/5 px-5 py-3 backdrop-blur-md">
              <div className="flex h-16 w-40 items-center justify-center border-r border-white/25 pr-5">
                <img
                  src={Azuza}
                  alt="Azuza Dialysis Center"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex h-16 w-40 items-center justify-center">
                <img
                  src={Aegle}
                  alt="Aegle Management"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* MAIN INFORMATION */}

          <div
            className="
              absolute
              left-10
              top-1/2
              w-full
              max-w-[490px]
              -translate-y-1/2
            "
          >
            <div
              className={`mb-5 h-1.5 w-16 rounded-full ${activeSlide.accent}`}
            />

            <p className="mb-4 text-sm font-bold uppercase tracking-[0.20em] text-white/70">
              Intelligent Healthcare Management
            </p>

            <h2
              key={activeSlide.title}
              className="
                max-w-[470px]
                text-4xl
                font-black
                leading-[1.08]
                tracking-tight
                text-white
                xl:text-5xl
              "
            >
              {activeSlide.title}
            </h2>

            <p
              key={activeSlide.text}
              className="
                mt-5
                max-w-[470px]
                text-base
                leading-7
                text-white/80
                xl:text-lg
              "
            >
              {activeSlide.text}
            </p>

            {/* FEATURES */}

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                'Secure Access',
                'Role-based Access',
                'Real-time Workflow',
              ].map((feature) => (
                <div
                  key={feature}
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-white/20
                    bg-white/10
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-white
                    backdrop-blur-xl
                  "
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <CheckIcon />
                  </span>

                  {feature}
                </div>
              ))}
            </div>

            {/* SLIDER DOTS */}

            <div className="mt-8 flex items-center gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setSlide(index)}
                  aria-label={`View slide ${index + 1}`}
                  className={`
                    h-2.5
                    rounded-full
                    transition-all
                    duration-500
                    ${
                      index === slide
                        ? 'w-10 bg-white'
                        : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }
                  `}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CENTER LOGIN
      ===================================================== */}

      <section className="absolute inset-0 z-20 flex items-center justify-center px-4 py-5 sm:px-6">
        <div className="w-full max-w-[650px]">
          {/* MOBILE LOGOS */}

          <div className="mb-4 flex items-center justify-center gap-5 lg:hidden">
            <div className="flex h-14 w-28 items-center justify-center border-r border-white/30 pr-4">
              <img
                src={Azuza}
                alt="Azuza Dialysis Center"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex h-14 w-28 items-center justify-center">
              <img
                src={Aegle}
                alt="Aegle Management"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* =================================================
              LOGIN CARD
          ================================================= */}

          <div
            className="
              rounded-[32px]
              border
              border-white/70
              bg-white/95
              p-7
              shadow-[0_35px_100px_-25px_rgba(15,23,42,0.5)]
              backdrop-blur-2xl
              sm:p-9
              xl:p-10
              [@media(max-height:780px)]:p-7
            "
          >
            {/* CARD HEADER */}

            <div className="mb-7 [@media(max-height:780px)]:mb-5">
              <div className="mb-5 flex items-center gap-4">
                <div
                  className="
                    inline-flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-blue-600
                    to-cyan-500
                    text-white
                    shadow-lg
                    shadow-blue-500/25
                  "
                >
                  <ShieldIcon className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-600">
                    Azuza Dialysis Center
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Powered by Aegle Management
                  </p>
                </div>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-slate-900 xl:text-5xl">
                Welcome back
              </h1>

              <p className="mt-2 max-w-lg text-base leading-7 text-slate-500 xl:text-lg">
                Sign in securely to access your dialysis management dashboard.
              </p>

              {roleHintLabel && (
                <div className="mt-4">
                  <span
                    className="
                      inline-flex
                      items-center
                      rounded-xl
                      border
                      border-blue-100
                      bg-blue-50
                      px-4
                      py-2
                      text-sm
                      font-bold
                      text-blue-700
                    "
                  >
                    Signing in as {roleHintLabel}
                  </span>
                </div>
              )}
            </div>

            {/* =================================================
                LOGIN FORM
            ================================================= */}

            <form
              onSubmit={submit}
              className="space-y-5 [@media(max-height:780px)]:space-y-4"
            >
              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-base font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="group relative">
                  <span
                    className="
                      pointer-events-none
                      absolute
                      inset-y-0
                      left-0
                      flex
                      items-center
                      pl-5
                      text-slate-400
                      transition-colors
                      group-focus-within:text-blue-600
                    "
                  >
                    <MailIcon />
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      changeCredentials(
                        'email',
                        event.target.value
                      )
                    }
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      py-4
                      pl-14
                      pr-5
                      text-base
                      font-medium
                      text-slate-900
                      outline-none
                      transition-all
                      placeholder:text-slate-400
                      hover:border-slate-300
                      focus:border-blue-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-blue-500/10
                      xl:py-[18px]
                      xl:text-lg
                    "
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-base font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="group relative">
                  <span
                    className="
                      pointer-events-none
                      absolute
                      inset-y-0
                      left-0
                      flex
                      items-center
                      pl-5
                      text-slate-400
                      transition-colors
                      group-focus-within:text-blue-600
                    "
                  >
                    <LockIcon />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) =>
                      changeCredentials(
                        'password',
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      py-4
                      pl-14
                      pr-14
                      text-base
                      font-medium
                      text-slate-900
                      outline-none
                      transition-all
                      placeholder:text-slate-400
                      hover:border-slate-300
                      focus:border-blue-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-blue-500/10
                      xl:py-[18px]
                      xl:text-lg
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    className="
                      absolute
                      inset-y-0
                      right-0
                      flex
                      items-center
                      px-5
                      text-slate-400
                      transition
                      hover:text-blue-600
                    "
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
              </div>

              {/* MFA */}

              {mfaRequired && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <ShieldIcon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-base font-bold text-blue-950">
                        Two-factor authentication
                      </p>

                      <p className="mt-0.5 text-sm leading-5 text-blue-700">
                        Enter the 6-digit code from your authenticator app.
                      </p>
                    </div>
                  </div>

                  <input
                    id="mfaToken"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={form.mfaToken}
                    onChange={(event) =>
                      updateField(
                        'mfaToken',
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      )
                    }
                    autoFocus
                    required
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-blue-200
                      bg-white
                      px-4
                      py-4
                      text-center
                      text-xl
                      font-bold
                      tracking-[0.45em]
                      text-slate-900
                      outline-none
                      transition
                      focus:border-blue-500
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  />
                </div>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={
                  loading ||
                  (mfaRequired &&
                    form.mfaToken.length !== 6)
                }
                className="
                  group
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-2xl
                  bg-gradient-to-r
                  from-blue-700
                  via-blue-600
                  to-cyan-500
                  px-6
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-xl
                  shadow-blue-500/25
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:shadow-2xl
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-500/20
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                  xl:py-[18px]
                  xl:text-lg
                "
              >
                {loading ? (
                  <>
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    {mfaRequired
                      ? 'Verifying code...'
                      : 'Signing you in...'}
                  </>
                ) : (
                  <>
                    {mfaRequired
                      ? 'Verify and continue'
                      : 'Sign in securely'}

                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon />
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* ONE SECURITY MESSAGE ONLY */}

            <div
              className="
                mt-6
                flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-slate-50
                px-4
                py-3
                text-sm
                text-slate-500
              "
            >
              <ShieldIcon className="h-4 w-4 text-emerald-600" />

              <span>
                Secure access for authorized clinic staff only
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SINGLE PAGE FOOTER
      ===================================================== */}

      <div
        className="
          absolute
          bottom-4
          left-1/2
          z-30
          hidden
          -translate-x-1/2
          items-center
          gap-2
          whitespace-nowrap
          text-xs
          text-white/70
          lg:flex
        "
      >
        <ShieldIcon className="h-4 w-4" />

        <span>
          © {new Date().getFullYear()} Azuza Dialysis Center · Powered by Aegle Management
        </span>
      </div>
    </main>
  );
}