import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Users } from 'lucide-react';
import { rosterApi } from '../../api/rosterApi';
import { SHIFTS } from '../../constants';

const SHIFT_META = {
  1: { label: '1st Shift', time: '05:00 - 08:00', color: 'from-amber-500 to-orange-500' },
  2: { label: '2nd Shift', time: '09:00 - 12:00', color: 'from-sky-500 to-blue-500' },
  3: { label: '3rd Shift', time: '12:30 - 16:00', color: 'from-violet-500 to-purple-500' },
};

/**
 * Quick-navigation boxes for Nurse / Technician / Doctor dashboards.
 * Top row: today's roster split by shift (1/2/3) with live counts; clicking a
 * box opens the patient list filtered to that shift.
 * Bottom row: day-pattern boxes (MWF / TTS) linking to the filtered list.
 */
export default function TodayRosterBoxes() {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    rosterApi.today()
      .then((r) => active && setRoster(r.data?.data || null))
      .catch(() => active && setRoster(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const counts = roster?.counts || { 1: 0, 2: 0, 3: 0 };
  const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sun size={18} className="text-amber-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Today&apos;s Dialysis · {todayStr}</h2>
      </div>

      {/* Today by shift */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((sh) => (
          <Link
            key={sh}
            to={`/patients?shift=${sh}`}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${SHIFT_META[sh].color} p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <p className="text-sm font-semibold opacity-90">Today · {SHIFT_META[sh].label}</p>
            <p className="mt-1 text-xs opacity-75">{SHIFT_META[sh].time}</p>
            <p className="mt-3 text-3xl font-black">
              {loading ? '—' : counts[sh]}
              <span className="ml-1 text-sm font-semibold opacity-80">patients</span>
            </p>
            <Users size={54} className="absolute -bottom-2 -right-2 opacity-15" />
          </Link>
        ))}
      </div>

      {/* Day-pattern quick nav */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/patients?dayPattern=mwf"
          className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-4 font-bold text-indigo-800 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span>Mon / Wed / Fri</span>
          <span className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white">MWF</span>
        </Link>
        <Link
          to="/patients?dayPattern=tts"
          className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 p-4 font-bold text-teal-800 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span>Tue / Thu / Sat</span>
          <span className="rounded-lg bg-teal-600 px-2 py-1 text-xs text-white">TTS</span>
        </Link>
      </div>
    </section>
  );
}
