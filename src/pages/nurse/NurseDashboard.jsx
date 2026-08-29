import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { sessionApi } from '../../api/sessionApi';
import { scheduleApi } from '../../api/scheduleApi';
import { medicationApi } from '../../api/medicationApi';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ScheduleCard from '../../components/common/ScheduleCard';
import PatientBoard from '../../components/common/PatientBoard';
import TodayRosterBoxes from '../../components/dashboard/TodayRosterBoxes';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { personName } from '../../utils/format';

const isSameDay = (date, referenceDate) => {
  if (!date) return false;

  const currentDate = new Date(date);

  return (
    currentDate.getFullYear() === referenceDate.getFullYear() &&
    currentDate.getMonth() === referenceDate.getMonth() &&
    currentDate.getDate() === referenceDate.getDate()
  );
};

const formatStatus = (status) =>
  status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusConfig = [
  {
    key: 'scheduled',
    label: 'Scheduled',
    description: 'Upcoming sessions',
  },
  {
    key: 'checked_in',
    label: 'Checked In',
    description: 'Patients arrived',
  },
  {
    key: 'ready',
    label: 'Ready',
    description: 'Ready for treatment',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    description: 'Active treatments',
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Finished sessions',
  },
];

function DashboardStatCard({
  title,
  value,
  description,
  progress = 0,
}) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  const [sessions, setSessions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const [sessionResult, scheduleResult, medicationResult] =
        await Promise.allSettled([
          sessionApi.list(),
          scheduleApi.list(),
          medicationApi.list(),
        ]);

      if (sessionResult.status === 'fulfilled') {
        setSessions(sessionResult.value.data?.data || []);
      }

      if (scheduleResult.status === 'fulfilled') {
        setSchedules(scheduleResult.value.data?.schedules || []);
      }

      if (medicationResult.status === 'fulfilled') {
        setMeds(medicationResult.value.data?.data || []);
      }

      const failedRequests = [
        sessionResult,
        scheduleResult,
        medicationResult,
      ].filter((result) => result.status === 'rejected');

      if (failedRequests.length === 3) {
        toast.error('Failed to load nurse dashboard');
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load nurse dashboard'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const today = useMemo(() => new Date(), []);

  const statusCounts = useMemo(() => {
    return sessions.reduce(
      (counts, session) => {
        if (session?.status && session.status in counts) {
          counts[session.status] += 1;
        }

        return counts;
      },
      {
        scheduled: 0,
        checked_in: 0,
        ready: 0,
        in_progress: 0,
        completed: 0,
      }
    );
  }, [sessions]);

  const nurseStats = useMemo(() => {
    const completedSessions = sessions.filter(
      (session) => session.status === 'completed'
    );

    const treatedPatientIds = new Set(
      completedSessions
        .map((session) => session.patient?._id || session.patient)
        .filter(Boolean)
    );

    const todayCompleted = completedSessions.filter((session) =>
      isSameDay(
        session.completedAt || session.updatedAt || session.createdAt,
        today
      )
    ).length;

    const monthlyCompleted = completedSessions.filter((session) => {
      const date = new Date(
        session.completedAt || session.updatedAt || session.createdAt
      );

      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }).length;

    return {
      completed: completedSessions.length,
      treated: treatedPatientIds.size,
      medications: meds.length,
      today: todayCompleted,
      monthly: monthlyCompleted,
    };
  }, [sessions, meds, today]);

  const pendingReview = useMemo(
    () =>
      sessions.filter(
        (s) => String(s.status || '').toLowerCase() === 'pending_review'
      ),
    [sessions]
  );

  const todaySchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          isSameDay(schedule.date, today) &&
          !schedule.expired &&
          schedule.status !== 'completed'
      ),
    [schedules, today]
  );

  const maximumStatusCount = useMemo(
    () => Math.max(...Object.values(statusCounts), 1),
    [statusCounts]
  );

  const maximumNurseStat = useMemo(
    () =>
      Math.max(
        nurseStats.completed,
        nurseStats.treated,
        nurseStats.medications,
        nurseStats.today,
        nurseStats.monthly,
        1
      ),
    [nurseStats]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nurse Dashboard"
        subtitle="Patients, treatment flow, schedules, vitals, SOAP and session history."
      />

      <TodayRosterBoxes />

      {/* Session workflow statistics */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Treatment Workflow
            </h2>

            <p className="text-sm text-slate-500">
              Current session status overview
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {sessions.length} total sessions
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statusConfig.map((status) => {
            const value = statusCounts[status.key] || 0;
            const progress = (value / maximumStatusCount) * 100;

            return (
              <DashboardStatCard
                key={status.key}
                title={status.label}
                value={loading ? '—' : value}
                description={status.description}
                progress={loading ? 0 : progress}
              />
            );
          })}
        </div>
      </section>

      {/* Nurse activity statistics */}
      

      {/* Today's schedule */}
      <section className="card space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Today's Schedule
            </h2>

            <p className="text-sm text-slate-500">
              Active patients scheduled for today
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            {todaySchedules.length} today
          </span>
        </div>

        {todaySchedules.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {todaySchedules.map((schedule, index) => (
              <ScheduleCard
                key={schedule._id || schedule.id || schedule.code}
                schedule={schedule}
                index={index + 1}
                onClick={() => {}}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No active patients scheduled for today" />
        )}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <ShieldCheck size={18} className="text-amber-600" />
              Dialysis Pending Your Review
            </h2>
            <p className="text-sm text-slate-500">
              Sessions submitted by a technician. Open one to review and sign it off.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            {pendingReview.length} awaiting
          </span>
        </div>

        {!pendingReview.length ? (
          <EmptyState message="Nothing is waiting for review." />
        ) : (
          <div className="space-y-2">
            {pendingReview.map((s) => (
              <div
                key={s._id}
                className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{personName(s.patient)}</p>
                  <p className="text-xs text-slate-500">
                    MRN {s.patient?.mrn || '—'}
                    {s.schedule?.sessionCode ? ` • ${s.schedule.sessionCode}` : ''}
                    {s.chair?.code ? ` • Station ${s.chair.code}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Submitted by {s.submittedForReviewByName || '—'}
                    {s.submittedForReviewAt
                      ? ` • ${new Date(s.submittedForReviewAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <Link className="btn-primary shrink-0 text-center text-sm" to="/workflow">
                  Review &amp; Sign Off
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <PatientBoard detailBase="/patients" />
    </div>
  );
}