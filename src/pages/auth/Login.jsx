import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { roleHome } from '../../constants';
import { useAuth } from '../../context/AuthContext';

import Aegle from '../../Assets/Aegle.png';
import Azuza from '../../Assets/Azuza.png';

// Solid brand backgrounds (fixed palette — no gradients).
const slides = [
  {
    bg: 'bg-[#123B5D]',
    accent: 'bg-[#087E8B]',
    title: 'Dialysis Care, Coordinated',
    text: 'Manage schedules, chairs, treatments, medications and patient records from one secure platform.',
  },
  {
    bg: 'bg-[#0f3151]',
    accent: 'bg-white',
    title: 'Safer Treatment Workflow',
    text: 'Capture vitals, treatment details, SOAP notes and session history at every chair.',
  },
  {
    bg: 'bg-[#087E8B]',
    accent: 'bg-[#123B5D]',
    title: 'Complete Medication Tracking',
    text: 'Track dialysis medications and home medicines with clear daily and monthly reports.',
  },
  {
    bg: 'bg-slate-900',
    accent: 'bg-[#087E8B]',
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
    dietitian: 'Dietitian',
    don: 'Director of Nursing',
    biomed: 'Biomed',
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

  /* =========================
     DEMO ACCOUNTS (one-click login for testing)
     Credentials match backend/src/utils/seed.js (npm run seed).
  ========================= */
  const DEMO_PASSWORD = 'Moscow@252';
  const DEMO_DOMAIN = 'aegle.care';
  const DEMO_ACCOUNTS = [
    { role: 'admin', label: 'Admin', local: 'admin' },
    { role: 'front_desk', label: 'Front Desk', local: 'frontdesk' },
    { role: 'doctor', label: 'Doctor', local: 'doctor' },
    { role: 'nurse', label: 'Nurse', local: 'nurse' },
    { role: 'technician', label: 'Technician', local: 'technician' },
    { role: 'social_worker', label: 'Social Worker', local: 'socialworker' },
    { role: 'biller', label: 'Biller', local: 'biller' },
    { role: 'insurance_person', label: 'Insurance', local: 'insurance' },
    { role: 'dietitian', label: 'Dietitian', local: 'dietitian' },
    { role: 'don', label: 'DON', local: 'don' },
    { role: 'biomed', label: 'Biomed', local: 'biomed' },
    { role: 'patient', label: 'Patient', local: 'patient' },
  ];

  const quickLogin = async (acc) => {
    const email = `${acc.local}@${DEMO_DOMAIN}`;
    setForm({ email, password: DEMO_PASSWORD, mfaToken: '' });
    setMfaRequired(false);
    setLoading(true);
    try {
      const result = await login({ email, password: DEMO_PASSWORD, mfaToken: '' });
      if (result?.mfaRequired) {
        setMfaRequired(true);
        toast('Enter your authenticator code to continue.', { icon: '🔐' });
        return;
      }
      const redirectTo = roleHome[result.user.role] || '/';
      toast.success(`Signed in as ${acc.label}`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Demo login failed — run "npm run seed" to create the accounts.');
    } finally {
      setLoading(false);
    }
  };

  const activeSlide = slides[slide];

 
return (
  <main className="fixed inset-0 z-[9999] overflow-x-hidden overflow-y-auto bg-[#102f4b] lg:overflow-y-auto">

    {/* BACKGROUND */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {slides.map((item, index) => (
        <div
          key={item.title}
          className={`absolute inset-0 ${item.bg} transition-opacity duration-1000 ${
            slide === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle,rgba(255,255,255,.9) 1px,transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute inset-0 bg-slate-950/10" />
    </div>

    {/* PAGE LAYOUT */}
    <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1900px] flex-col px-3 sm:px-5 lg:px-7 xl:px-10">

      {/* BRAND HEADER - LEFT ON DESKTOP */}
      <header className="flex shrink-0 justify-center py-3 lg:justify-start lg:py-3">
        <div className="flex items-center gap-3 rounded-2xl bg-black/10 px-3 py-2 backdrop-blur-sm sm:gap-5 sm:px-4">

          <div className="flex h-11 w-28 items-center justify-center border-r border-white/25 pr-3 sm:h-12 sm:w-36 sm:pr-5">
            <img
              src={Azuza}
              alt="Azuza Dialysis Center"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex h-11 w-24 items-center justify-center sm:h-12 sm:w-32">
            <img
              src={Aegle}
              alt="Aegle Management"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </header>

      {/* HERO + FORM */}
      <div
        className="
          grid
          w-full
          flex-1
          grid-cols-1
          items-center
          gap-4
          py-2

          lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]
          lg:gap-6

          xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]
          xl:gap-8

          2xl:grid-cols-[minmax(0,1fr)_minmax(0,650px)]
          2xl:gap-12
        "
      >

        {/* LEFT HERO */}
        <section className="hidden min-w-0 items-center lg:flex">
          <div className="max-w-[670px] text-white">

            <div className={`mb-4 h-1.5 w-16 rounded-full ${activeSlide.accent}`} />

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/75 xl:text-sm">
              Intelligent Healthcare Management
            </p>

            <h2 className="text-[clamp(27px,2.7vw,44px)] font-black leading-[1.15] tracking-tight">
              {activeSlide.title}
            </h2>

            <p className="mt-5 max-w-[650px] text-sm leading-7 text-white/85 xl:text-base">
              {activeSlide.text}
            </p>

            {/* BENEFITS */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                'Secure Access',
                'Role-based Access',
                'Real-time Workflow',
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold backdrop-blur-md"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <CheckIcon />
                  </span>
                  {feature}
                </div>
              ))}
            </div>

            {/* SLIDER DOTS */}
            <div className="mt-7 flex items-center gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setSlide(index)}
                  aria-label={`View slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === slide
                      ? 'w-10 bg-white'
                      : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>

          </div>
        </section>

        {/* RIGHT LOGIN CARD */}
        <section className="mx-auto w-full min-w-0 max-w-[650px] lg:ml-auto">

          <div className="w-full rounded-[22px] border border-white/70 bg-[#f3f5f8] p-4 shadow-2xl sm:p-5 lg:p-[18px] xl:p-5">

            {/* CLINIC HEADER */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#123B5D] text-white shadow-md">
                <ShieldIcon />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#123B5D]">
                  Azuza Dialysis Center
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Powered by Aegle Management
                </p>
              </div>
            </div>

            <h1 className="text-[28px] font-black leading-tight tracking-tight text-slate-900 xl:text-[32px]">
              Welcome back
            </h1>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Sign in securely to access your dialysis management dashboard.
            </p>

            {/* ROLE */}
            {roleHintLabel && (
              <div className="mt-3">
                <span className="inline-flex max-w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-[13px] font-bold text-[#123B5D]">
                  Signing in as {roleHintLabel}
                </span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={submit} className="mt-4 space-y-3">

              {/* EMAIL */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Email address
                </label>

                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-600">
                    <MailIcon />
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => changeCredentials('email', e.target.value)}
                    autoComplete="username"
                    placeholder="name@example.com"
                    required
                    className="block h-[46px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Password
                </label>

                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-600">
                    <LockIcon />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => changeCredentials('password', e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    className="block h-[46px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-blue-600"
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
              </div>

              {/* MFA */}
              {mfaRequired && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldIcon className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-bold text-blue-950">
                      Two-factor authentication
                    </p>
                  </div>

                  <p className="mb-2 text-xs text-blue-700">
                    Enter the 6-digit code from your authenticator app.
                  </p>

                  <input
                    id="mfaToken"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={form.mfaToken}
                    onChange={(e) =>
                      updateField(
                        'mfaToken',
                        e.target.value.replace(/\D/g, '').slice(0, 6)
                      )
                    }
                    autoFocus
                    required
                    className="h-12 w-full rounded-xl border border-blue-200 bg-white text-center text-xl font-bold tracking-[0.3em] outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* SIGN IN BUTTON */}
              <button
                type="submit"
                disabled={loading || (mfaRequired && form.mfaToken.length !== 6)}
                className="flex min-h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-[#123B5D] px-4 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#0f3151] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {mfaRequired ? 'Verifying code...' : 'Signing you in...'}
                  </>
                ) : (
                  <>
                    {mfaRequired ? 'Verify and continue' : 'Sign in securely'}
                    <ArrowIcon />
                  </>
                )}
              </button>
            </form>

            {/* DEMO ACCOUNTS - ALL 12 RESTORED (shown in all builds) */}
            {true && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Demo Accounts (Testing)
                  </p>

                  <span className="text-[11px] text-slate-400">
                    Development only
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => quickLogin(acc)}
                      disabled={loading}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SECURITY NOTICE */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/60 px-3 py-2.5 text-center text-xs text-slate-500">
              <ShieldIcon className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Secure access for authorized clinic staff only</span>
            </div>

          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="flex shrink-0 items-center justify-center gap-2 px-2 py-2 text-center text-[11px] leading-5 text-white/70">
        <ShieldIcon className="h-4 w-4 shrink-0" />
        <span>
          © {new Date().getFullYear()} Azuza Dialysis Center · Powered by Aegle Management
        </span>
      </footer>

    </div>
  </main>
);

}