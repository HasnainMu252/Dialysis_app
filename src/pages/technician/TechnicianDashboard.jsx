import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Settings,
  Stethoscope,
  UserRound,
  Wrench,
} from 'lucide-react';

import { chairApi } from '../../api/chairApi';
import { scheduleApi } from '../../api/scheduleApi';

import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import StatusBadge from '../../components/ui/StatusBadge';
import PatientBoard from '../../components/common/PatientBoard';

import { CHAIR_STATUS } from '../../constants';
import { dateOnly } from '../../utils/format';

const statusIcons = {
  available: CheckCircle2,
  occupied: UserRound,
  maintenance: Wrench,
  cleaning: Activity,
  unavailable: AlertTriangle,
  reserved: Clock3,
};

const statusDescriptions = {
  available: 'Ready for patient use',
  occupied: 'Currently in treatment',
  maintenance: 'Requires technical service',
  cleaning: 'Awaiting sanitation',
  unavailable: 'Not available for use',
  reserved: 'Assigned to a schedule',
};

const getStatusIcon = (status) => {
  const normalized = String(status || '').toLowerCase();
  return statusIcons[normalized] || Stethoscope;
};

const getStatusDescription = (status) => {
  const normalized = String(status || '').toLowerCase();
  return statusDescriptions[normalized] || 'Station status';
};

const formatStatusTitle = (status) =>
  String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPatientName = (schedule) => {
  if (schedule?.patientName) return schedule.patientName;

  const firstName =
    schedule?.patient?.firstName ||
    schedule?.patientFirstName ||
    '';

  const lastName =
    schedule?.patient?.lastName ||
    schedule?.patientLastName ||
    '';

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Patient';
};

const formatStation = (schedule) =>
  schedule?.chair?.code ||
  schedule?.chair?.chairNumber ||
  schedule?.chairCode ||
  schedule?.stationCode ||
  'Not assigned';

const formatTimeRange = (schedule) => {
  const start = schedule?.startTime || '—';
  const end = schedule?.endTime || '—';

  return `${start} – ${end}`;
};

export default function TechnicianDashboard() {
  const [chairs, setChairs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [chairResult, scheduleResult] = await Promise.allSettled([
        chairApi.list(),
        scheduleApi.today(),
      ]);

      if (chairResult.status === 'fulfilled') {
        setChairs(chairResult.value.data?.data || []);
      } else {
        setChairs([]);
        toast.error(
          chairResult.reason?.response?.data?.message ||
            'Failed to load station status'
        );
      }

      if (scheduleResult.status === 'fulfilled') {
        setSchedules(
          scheduleResult.value.data?.schedules ||
            scheduleResult.value.data?.data ||
            []
        );
      } else {
        setSchedules([]);
        toast.error(
          scheduleResult.reason?.response?.data?.message ||
            'Failed to load today’s schedules'
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load technician dashboard'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const todaySchedules = useMemo(
    () =>
      schedules
        .filter((schedule) => !schedule.expired)
        .sort((a, b) =>
          String(a.startTime || '').localeCompare(String(b.startTime || ''))
        ),
    [schedules]
  );

  const stationStats = useMemo(
    () =>
      CHAIR_STATUS.map((status) => {
        const count = chairs.filter(
          (chair) =>
            String(chair.status || '').toLowerCase() ===
            String(status).toLowerCase()
        ).length;

        return {
          status,
          count,
          icon: getStatusIcon(status),
          description: getStatusDescription(status),
        };
      }),
    [chairs]
  );

  const activeTreatments = useMemo(
    () =>
      chairs.filter((chair) =>
        ['occupied', 'in_use', 'in use'].includes(
          String(chair.status || '').toLowerCase()
        )
      ).length,
    [chairs]
  );

  const maintenanceStations = useMemo(
    () =>
      chairs.filter((chair) =>
        ['maintenance', 'repair', 'out_of_service'].includes(
          String(chair.status || '').toLowerCase()
        )
      ).length,
    [chairs]
  );

  if (loading) {
    return <Loading message="Loading technician dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician Dashboard"
        subtitle="Monitor station availability, technical clearance and today’s patient treatment workflow."
        action={
          <button
            type="button"
            className="btn-light inline-flex items-center gap-2"
            onClick={() => load({ showLoader: true })}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Total Stations"
          value={chairs.length}
          subtitle="Registered dialysis stations"
          icon={Stethoscope}
        />

        <DashboardStatCard
          title="Active Treatments"
          value={activeTreatments}
          subtitle="Stations currently occupied"
          icon={Activity}
        />

        <DashboardStatCard
          title="Today's Patients"
          value={todaySchedules.length}
          subtitle="Active schedules for today"
          icon={UserRound}
        />

        <DashboardStatCard
          title="Need Maintenance"
          value={maintenanceStations}
          subtitle="Stations requiring attention"
          icon={Wrench}
        />
      </div>

      {!!stationStats.length && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Station Status Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current availability and technical condition of all dialysis
                stations.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
              {chairs.length} Total Stations
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stationStats.map(({ status, count, icon: Icon, description }) => (
              <div
                key={status}
                className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      {formatStatusTitle(status)}
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {count}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-100 transition group-hover:scale-105">
                    <Icon size={20} />
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PatientBoard detailBase="/patients" />

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,2fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Station Status
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live condition and location of each station.
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Settings size={20} />
            </div>
          </div>

          <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
            {chairs.map((chair) => {
              const Icon = getStatusIcon(chair.status);

              return (
                <div
                  className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
                  key={chair._id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <Icon size={20} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-extrabold text-slate-900">
                          Station {chair.code || chair.chairNumber || '—'}
                        </h3>

                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                          {chair.location || 'Location not specified'}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={chair.status || 'unknown'} />
                  </div>

                  {chair.conditionNotes && (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                      <span className="font-bold text-slate-600">
                        Condition:
                      </span>{' '}
                      {chair.conditionNotes}
                    </div>
                  )}
                </div>
              );
            })}

            {!chairs.length && (
              <EmptyState message="No dialysis stations have been added yet." />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Today&apos;s Scheduled Patients
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review assigned stations and today&apos;s active treatment
                timings.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              {todaySchedules.length} Scheduled
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {todaySchedules.map((schedule) => (
              <div
                key={schedule.id || schedule._id}
                className="p-5 transition hover:bg-blue-50/30"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white shadow-md shadow-blue-100">
                      {formatPatientName(schedule)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-slate-900">
                        {formatPatientName(schedule)}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {schedule.patientMrn ||
                          schedule.patient?.mrn ||
                          'No MRN'}
                        {' • '}
                        {schedule.patientPhone ||
                          schedule.patient?.phone ||
                          'No phone'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          <Clock3 size={13} />
                          {formatTimeRange(schedule)}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          <Stethoscope size={13} />
                          Station {formatStation(schedule)}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {dateOnly(schedule.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
                    <StatusBadge
                      status={schedule.expired ? 'expired' : schedule.status}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!todaySchedules.length && (
            <div className="p-5">
              <EmptyState message="No active schedules for today." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="group relative min-h-[150px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-50 transition duration-300 group-hover:scale-110" />

      <div className="relative z-10 flex h-full items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase leading-5 tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-4xl font-black leading-none text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>

          <div className="mt-4 h-2 w-full max-w-[130px] overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
          </div>
        </div>

        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200 transition group-hover:rotate-3 group-hover:scale-105">
          <Icon size={25} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}