import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  X, ShieldCheck } from 'lucide-react';

import { sessionApi } from '../../api/sessionApi';
import {
  medicationApi,
  MEDICATION_ROUTES,
  COMMON_UNITS,
} from '../../api/medicationApi';
import {
  homeMedicationApi,
  HOME_MED_ROUTES,
  HOME_MED_UNITS,
  HOME_MED_FREQUENCIES,
} from '../../api/homeMedicationApi';
import { chairClearanceApi } from '../../api/chairClearanceApi';

import { SHIFTS, shiftIdFromTime } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  canManageHomeMedication,
  canManageDialysisMedication,
  canAddSessionNote,
} from '../../utils/permissions';
import { personName } from '../../utils/format';

import NoteAuthor from '../../components/common/NoteAuthor';
import MedicationCard from '../../components/workflow/MedicationCard';
import HomeMedicationCard from '../../components/workflow/HomeMedicationCard';
import SessionNotesCard from '../../components/workflow/SessionNotesCard';
import NurseReviewCard from '../../components/workflow/NurseReviewCard';
import LabPanel from '../../components/common/LabPanel';
import DialysisPrescriptionViewer from '../../components/common/DialysisPrescriptionViewer';
import HomeMedQuickAdd from '../../components/common/HomeMedQuickAdd';
import CqiPanel from '../../components/common/CqiPanel';
import { accessTypesForRole } from '../../api/medicationApi';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';

const BLANK_VITALS = {
  phase: 'before',
  bloodPressure: '',
  heartRate: '',
  temperature: '',
  weight: '',
  spo2: '',
};

const BLANK_SOAP = {
  access: '',
  accessOther: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
};

const BLANK_MEDICATION = {
  name: '',
  dose: '',
  unit: 'mg',
  route: 'IV',
  quantity: 1,
  notes: '',
};

const BLANK_HOME_MEDICATION = {
  name: '',
  dose: '',
  unit: 'mg',
  route: 'Oral',
  frequency: 'Once daily',
  quantity: 1,
  prescribedBy: '',
  notes: '',
};

const BLANK_NOTE = {
  accessType: '',
  accessOther: '',
  comment: '',
};

const DEFAULT_CHAIR_CHECKLIST = {
  chairChecked: true,
  machineChecked: true,
  filterChecked: true,
  solutionChecked: true,
  cleaned: true,
  safeForUse: true,
};

const QUICK_MEDS = [
  { name: 'Epogen', dose: 5000, unit: 'Units', route: 'IV' },
  { name: 'Heparin', dose: 3000, unit: 'Units', route: 'IV' },
  { name: 'Venofer', dose: 100, unit: 'mg', route: 'IV' },
  { name: 'Calcitriol', dose: 0.5, unit: 'mcg', route: 'IV' },
  { name: 'Benadryl', dose: 25, unit: 'mg', route: 'IV' },
  { name: 'Oxygen', dose: 30, unit: 'min', route: 'Inhaled' },
  { name: 'LiquaCel', dose: 30, unit: 'ml', route: 'Oral' },
];

const ACTIVE_STATUSES = [
  'scheduled',
  'checked_in',
  'ready',
  'in_progress',
  'pending_review',
];

const formatStatusLabel = (status = '') =>
  String(status)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getSessionDate = (session) =>
  session?.schedule?.date ||
  session?.scheduledDate ||
  session?.date ||
  session?.createdAt;

const toValidDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getLocalDateBoundary = (value, endOfDay = false) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
};

const formatDate = (value) => {
  const date = toValidDate(value);
  return date
    ? date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';
};

const formatTime = (value) => {
  const date = toValidDate(value);
  return date
    ? date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
};

const formatDateTime = (value) => {
  const date = toValidDate(value);
  return date ? date.toLocaleString() : '—';
};

const numericValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function LoadingSessionCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-14 rounded-xl bg-slate-100" />
            <div className="h-14 rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TreatmentWorkflow() {
  const { user } = useAuth();

  const allowHomeMed = canManageHomeMedication(user?.role);
  const allowMeds = canManageDialysisMedication(user?.role);
  const allowNote = canAddSessionNote(user?.role);

  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [view, setView] = useState('scheduled');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [vitals, setVitals] = useState({ ...BLANK_VITALS });
  const [soap, setSoap] = useState({ ...BLANK_SOAP });
  const [summary, setSummary] = useState(
    'Dialysis completed successfully without complications.'
  );

  const [meds, setMeds] = useState([{ ...BLANK_MEDICATION }]);
  const [sessionMeds, setSessionMeds] = useState([]);
  const [savingMeds, setSavingMeds] = useState(false);

  const [homeMeds, setHomeMeds] = useState([]);
  const [homeMedForm, setHomeMedForm] = useState({
    ...BLANK_HOME_MEDICATION,
  });
  const [savingHomeMed, setSavingHomeMed] = useState(false);

  const [sessionNotes, setSessionNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ ...BLANK_NOTE });
  const [savingNote, setSavingNote] = useState(false);

  // Nurse review / digital sign-off of a technician-submitted session
  const [signature, setSignature] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [attested, setAttested] = useState(false);

  const [docFiles, setDocFiles] = useState([]);
  const [docName, setDocName] = useState('');
  const [docInputKey, setDocInputKey] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);

    try {
      const response = await sessionApi.list();
      const rows = response.data?.data || [];
      setSessions(rows);
      return rows;
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load treatment workflow'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const reloadSessionMeds = useCallback(async (sessionId) => {
    if (!sessionId) {
      setSessionMeds([]);
      return;
    }

    try {
      const response = await medicationApi.list({ session: sessionId, includeInactive: 1 });
      setSessionMeds(response.data?.data || []);
    } catch {
      setSessionMeds([]);
    }
  }, []);

  const loadHomeMeds = useCallback(async (patientRef) => {
    if (!patientRef) {
      setHomeMeds([]);
      return;
    }

    try {
      const response = await homeMedicationApi.list(patientRef, { includeInactive: 1 });
      setHomeMeds(response.data?.data || []);
    } catch {
      setHomeMeds([]);
    }
  }, []);

  const loadSelectedSessionData = useCallback(
    async (session) => {
      if (!session?._id) return;

      const patientRef = session.patient?._id || session.patient;

      await Promise.all([
        reloadSessionMeds(session._id),
        loadHomeMeds(patientRef),
      ]);

      setSessionNotes(session.technicianNotes || []);
    },
    [loadHomeMeds, reloadSessionMeds]
  );

  const resetSessionForms = useCallback(() => {
    setVitals({ ...BLANK_VITALS });
    setSoap({ ...BLANK_SOAP });
    setSummary(
      'Dialysis completed successfully without complications.'
    );
    setMeds([{ ...BLANK_MEDICATION }]);
    setHomeMedForm({ ...BLANK_HOME_MEDICATION });
    setNoteForm({ ...BLANK_NOTE });
    setDocFiles([]);
    setDocName('');
    setDocInputKey((current) => current + 1);
  }, []);

  const openSession = useCallback(
    async (session) => {
      setSelected(session);
      resetSessionForms();
      setSessionMeds([]);
      setHomeMeds([]);
      setSessionNotes(session?.technicianNotes || []);

      await loadSelectedSessionData(session);
    },
    [loadSelectedSessionData, resetSessionForms]
  );

  const refreshSession = useCallback(
    async (sessionId) => {
      const rows = await loadSessions();
      if (!rows || !sessionId) return null;

      const latest = rows.find((session) => session._id === sessionId);

      if (latest) {
        setSelected(latest);
        await loadSelectedSessionData(latest);
      }

      return latest || null;
    },
    [loadSelectedSessionData, loadSessions]
  );

  const action = useCallback(
    async (message, request) => {
      if (!selected?._id) return false;

      setActionLoading(true);

      try {
        await request();
        toast.success(message);
        await refreshSession(selected._id);
        return true;
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Action failed'
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [refreshSession, selected?._id]
  );

  const setMedField = (index, key, value) => {
    setMeds((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    );
  };

  const addMedRow = (preset) => {
    setMeds((rows) => [
      ...rows,
      preset
        ? {
            ...BLANK_MEDICATION,
            ...preset,
          }
        : { ...BLANK_MEDICATION },
    ]);
  };

  const removeMedRow = (index) => {
    setMeds((rows) =>
      rows.length > 1
        ? rows.filter((_, rowIndex) => rowIndex !== index)
        : [{ ...BLANK_MEDICATION }]
    );
  };

  const saveMeds = async () => {
    if (!selected?._id) return;

    const valid = meds.filter((medication) =>
      medication.name.trim()
    );

    if (!valid.length) {
      toast.error('Add at least one medication');
      return;
    }

    setSavingMeds(true);

    try {
      await medicationApi.recordForSession(
        selected._id,
        valid.map((medication) => ({
          ...medication,
          dose: numericValue(medication.dose),
          quantity: Math.max(
            1,
            numericValue(medication.quantity) || 1
          ),
        }))
      );

      toast.success(`Recorded ${valid.length} medication(s)`);
      setMeds([{ ...BLANK_MEDICATION }]);
      await reloadSessionMeds(selected._id);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to record medications'
      );
    } finally {
      setSavingMeds(false);
    }
  };

  const deleteSessionMed = async (medication) => {
    if (
      !window.confirm(
        `Remove "${medication.name}" from this session?`
      )
    ) {
      return;
    }

    try {
      await medicationApi.remove(medication._id);
      toast.success('Medication removed');
      await reloadSessionMeds(selected?._id);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Delete failed'
      );
    }
  };

  const cancelSessionMed = async (medication) => {
    const reason = window.prompt(`Stop "${medication.name}"? Optional reason:`, '');
    if (reason === null) return; // cancelled the prompt
    try {
      await medicationApi.cancel(medication._id, reason || '');
      toast.success('Medication stopped');
      await reloadSessionMeds(selected?._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to stop medication');
    }
  };

  const quickAddHomeMed = (med) => {
    // Prefill the workflow's add form so the user can adjust before adding.
    setHomeMedForm((current) => ({
      ...current,
      name: med.name,
      dose: med.dose,
      unit: med.unit,
      route: med.route,
      frequency: med.frequency,
      quantity: med.quantity || 1,
    }));
    toast.success(`${med.name} loaded — adjust the dose and click Add`);
  };

  const saveHomeMed = async () => {
    if (!homeMedForm.name.trim()) {
      toast.error('Enter a home medication name');
      return;
    }

    const patientRef =
      selected?.patient?._id || selected?.patient;

    if (!patientRef) {
      toast.error('No patient is attached to this session');
      return;
    }

    setSavingHomeMed(true);

    try {
      await homeMedicationApi.add(patientRef, {
        ...homeMedForm,
        dose: numericValue(homeMedForm.dose),
        quantity: Math.max(
          1,
          numericValue(homeMedForm.quantity) || 1
        ),
      });

      toast.success('Home medication added');
      setHomeMedForm({ ...BLANK_HOME_MEDICATION });
      await loadHomeMeds(patientRef);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to add home medication'
      );
    } finally {
      setSavingHomeMed(false);
    }
  };

  const deleteHomeMedInWorkflow = async (medication) => {
    if (
      !window.confirm(
        `Delete "${medication.name}" from this patient's home medications?`
      )
    ) {
      return;
    }

    try {
      await homeMedicationApi.remove(medication._id);
      toast.success('Home medication removed');

      await loadHomeMeds(
        selected?.patient?._id || selected?.patient
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Delete failed'
      );
    }
  };

  const stopHomeMedInWorkflow = async (medication) => {
    const patientRef = selected?.patient?._id || selected?.patient;
    if (medication.status === 'active') {
      const reason = window.prompt(`Stop "${medication.name}"? Optional reason:`, '');
      if (reason === null) return;
      try {
        await homeMedicationApi.cancel(medication._id, reason || '');
        toast.success('Home medication stopped');
        await loadHomeMeds(patientRef);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to stop');
      }
    } else if (medication.status === 'discontinued' || medication.status === 'cancelled') {
      try {
        await homeMedicationApi.reactivate(medication._id);
        toast.success('Home medication reactivated');
        await loadHomeMeds(patientRef);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to reactivate');
      }
    }
  };

  const saveNote = async () => {
    if (
      !noteForm.comment.trim() &&
      !noteForm.accessType
    ) {
      toast.error('Add an access type or a comment');
      return;
    }

    setSavingNote(true);

    try {
      const response = await sessionApi.addNote(
        selected._id,
        noteForm
      );

      setSessionNotes(response.data?.data || []);
      setNoteForm({ ...BLANK_NOTE });
      toast.success('Note added');
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to add note'
      );
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (note) => {
    try {
      const response = await sessionApi.deleteNote(
        selected._id,
        note._id
      );

      setSessionNotes(response.data?.data || []);
      toast.success('Note removed');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Delete failed'
      );
    }
  };

  const saveVitals = () =>
    action('Vitals saved', () =>
      sessionApi.vitals(selected._id, {
        ...vitals,
        heartRate: numericValue(vitals.heartRate),
        temperature: numericValue(vitals.temperature),
        weight: numericValue(vitals.weight),
        spo2: numericValue(vitals.spo2),
      })
    );

  const saveSoap = () =>
    action('SOAP saved', () =>
      sessionApi.soap(selected._id, soap)
    );

  const isTechnician = user?.role === 'technician';

  const completeAndClean = async () => {
    const completed = await action(
      isTechnician ? 'Submitted for nurse review' : 'Session completed',
      () => sessionApi.complete(selected._id, {
        treatmentSummary: summary,
      })
    );

    if (!completed) return;

    // A technician submission is NOT a close — the nurse signs off and the
    // station is released then. Skip the clearance step.
    if (isTechnician) return;

    const stationCode =
      selected?.chair?.code ||
      selected?.chair?.chairNumber;

    if (!stationCode) return;

    try {
      await chairClearanceApi.create(stationCode, {
        status: 'available',
        notes: 'Post-treatment station cleaned and ready.',
        checklist: DEFAULT_CHAIR_CHECKLIST,
      });

      toast.success('Station cleared and available');
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Station clearance failed'
      );
    }
  };

  /** Nurse reviews a technician-submitted session and closes it with a signature. */
  const finalizeWithSignature = async () => {
    if (!signature.trim()) {
      toast.error('Type your full name as a digital signature');
      return;
    }
    if (!attested) {
      toast.error('Please confirm you have reviewed the record');
      return;
    }

    const done = await action('Session reviewed and closed', () =>
      sessionApi.finalize(selected._id, {
        signatureName: signature.trim(),
        attested: true,
        reviewNotes,
        treatmentSummary: summary,
      })
    );

    if (!done) return;

    setSignature('');
    setReviewNotes('');
    setAttested(false);

    const stationCode = selected?.chair?.code || selected?.chair?.chairNumber;
    if (!stationCode) return;
    try {
      await chairClearanceApi.create(stationCode, {
        status: 'available',
        notes: 'Post-treatment station cleaned and ready.',
        checklist: DEFAULT_CHAIR_CHECKLIST,
      });
      toast.success('Station cleared and available');
    } catch {
      /* clearance is best-effort; the session is already closed */
    }
  };

  const uploadDocs = async () => {
    if (!selected?._id || !docFiles.length) {
      toast.error('Select file(s) first');
      return;
    }

    setUploadingDoc(true);

    try {
      await sessionApi.uploadDocuments(selected._id, {
        files: docFiles,
        name: docName,
      });

      toast.success(`${docFiles.length} file(s) uploaded`);

      setDocFiles([]);
      setDocName('');
      setDocInputKey((current) => current + 1);
      await refreshSession(selected._id);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Upload failed'
      );
    } finally {
      setUploadingDoc(false);
    }
  };

  const scheduledCount = useMemo(() => {
    const today = startOfToday();

    return sessions.filter((session) => {
      const sessionStatus = String(
        session.status || ''
      ).toLowerCase();

      const sessionDate = toValidDate(
        getSessionDate(session)
      );

      return (
        sessionDate &&
        sessionDate >= today &&
        ACTIVE_STATUSES.includes(sessionStatus)
      );
    }).length;
  }, [sessions]);

  const reviewCount = useMemo(
    () =>
      sessions.filter(
        (session) =>
          String(session.status || '').toLowerCase() ===
          'pending_review'
      ).length,
    [sessions]
  );

  const completedCount = useMemo(
    () =>
      sessions.filter(
        (session) =>
          String(session.status || '').toLowerCase() ===
          'completed'
      ).length,
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const today = startOfToday();
    const fromBoundary = getLocalDateBoundary(dateFrom);
    const toBoundary = getLocalDateBoundary(dateTo, true);
    const keyword = search.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const sessionStatus = String(
          session.status || ''
        ).toLowerCase();

        const sessionDate = toValidDate(
          getSessionDate(session)
        );

        if (!sessionDate) return false;

        if (view === 'scheduled') {
          if (
            !ACTIVE_STATUSES.includes(sessionStatus) ||
            sessionDate < today
          ) {
            return false;
          }
        }

        if (
          view === 'completed' &&
          sessionStatus !== 'completed'
        ) {
          return false;
        }

        // Nurse review queue: only technician-submitted sessions awaiting sign-off.
        if (
          view === 'review' &&
          sessionStatus !== 'pending_review'
        ) {
          return false;
        }

        if (status && sessionStatus !== status) {
          return false;
        }

        // Shift filter: 1 = 05:00-08:00, 2 = 09:00-12:00, 3 = 12:30-16:00.
        // Falls back to deriving from startTime for schedules created before
        // the shift field existed.
        if (shiftFilter) {
          const sched = session.schedule || {};
          const sessionShift =
            sched.shift ?? shiftIdFromTime(sched.startTime);
          if (Number(sessionShift) !== Number(shiftFilter)) {
            return false;
          }
        }

        if (
          fromBoundary &&
          sessionDate < fromBoundary
        ) {
          return false;
        }

        if (toBoundary && sessionDate > toBoundary) {
          return false;
        }

        if (keyword) {
          const patientName = personName(
            session.patient
          ).toLowerCase();

          const mrn = String(
            session.patient?.mrn || ''
          ).toLowerCase();

          const chair = String(
            session.chair?.code ||
              session.chair?.chairNumber ||
              ''
          ).toLowerCase();

          const scheduleCode = String(
            session.schedule?.code ||
              session.schedule?._id ||
              session.schedule ||
              ''
          ).toLowerCase();

          const matches =
            patientName.includes(keyword) ||
            mrn.includes(keyword) ||
            chair.includes(keyword) ||
            scheduleCode.includes(keyword);

          if (!matches) return false;
        }

        return true;
      })
      .sort((first, second) => {
        const firstDate =
          view === 'completed'
            ? toValidDate(first.completedAt) ||
              toValidDate(getSessionDate(first))
            : toValidDate(getSessionDate(first));

        const secondDate =
          view === 'completed'
            ? toValidDate(second.completedAt) ||
              toValidDate(getSessionDate(second))
            : toValidDate(getSessionDate(second));

        const difference =
          (firstDate?.getTime() || 0) -
          (secondDate?.getTime() || 0);

        return view === 'completed'
          ? -difference
          : difference;
      });
  }, [
    dateFrom,
    dateTo,
    search,
    sessions,
    shiftFilter,
    status,
    view,
  ]);

  const changeView = (nextView) => {
    setView(nextView);
    setStatus('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelected(null);
    setSessionMeds([]);
    setHomeMeds([]);
    setSessionNotes([]);
  };

  const selectedStatus = String(
    selected?.status || ''
  ).toLowerCase();

  const isScheduled =
    selectedStatus === 'scheduled' ||
    selectedStatus === 'ready';

  const isCheckedIn =
    selectedStatus === 'checked_in';

  const isInProgress =
    selectedStatus === 'in_progress';

  const isCompleted =
    selectedStatus === 'completed';

  // Technician-submitted, awaiting nurse sign-off. The nurse must still be able
  // to see and correct everything, so the full workflow renders in this state.
  const isPendingReview =
    selectedStatus === 'pending_review';

  const durationMin =
    selected?.startedAt && selected?.completedAt
      ? Math.round(
          (new Date(selected.completedAt) -
            new Date(selected.startedAt)) /
            60000
        )
      : null;

  const nurseName =
    selected?.assignedNurse?.name ||
    selected?.nurse?.name ||
    selected?.startedBy?.name ||
    '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatment Workflow"
        subtitle="Manage scheduled, active and completed dialysis treatment sessions."
      />

      <section className="card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => changeView('scheduled')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                view === 'scheduled'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={17} />
              Scheduled
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {scheduledCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => changeView('review')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                view === 'review'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={17} />
              Pending Review
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {reviewCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => changeView('completed')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                view === 'completed'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 size={17} />
              Completed
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {completedCount}
              </span>
            </button>
          </div>

          <button
            type="button"
            className="btn-light inline-flex items-center justify-center gap-2"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              className="input pl-10"
              placeholder="Search patient, MRN, chair or schedule..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="input"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            disabled={view === 'completed' || view === 'review'}
          >
            <option value="">
              {view === 'completed'
                ? 'Completed sessions'
                : view === 'review'
                  ? 'Pending nurse review'
                  : 'All active statuses'}
            </option>

            {view === 'scheduled' &&
              ACTIVE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatStatusLabel(item)}
                </option>
              ))}
          </select>

          <div>
            <FieldLabel>Shift</FieldLabel>
            <select
              className="input"
              value={shiftFilter}
              onChange={(event) =>
                setShiftFilter(event.target.value)
              }
            >
              <option value="">All shifts</option>
              {SHIFTS.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.label} ({sh.time})
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>From date</FieldLabel>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(event) =>
                setDateFrom(event.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>To date</FieldLabel>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(event) =>
                setDateTo(event.target.value)
              }
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-extrabold text-slate-900">
                {view === 'scheduled'
                  ? 'Current & Upcoming Sessions'
                  : view === 'review'
                    ? 'Awaiting Nurse Review'
                    : 'Completed Sessions'}
              </h2>

              <p className="text-xs text-slate-500">
                {filteredSessions.length} session(s) found
              </p>
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] space-y-3 overflow-y-auto pr-1">
            {loading && sessions.length === 0 ? (
              <LoadingSessionCards />
            ) : (
              filteredSessions.map((session) => {
                const active =
                  selected?._id === session._id;

                const sessionDate =
                  getSessionDate(session);

                return (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => openSession(session)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left transition ${
                      active
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-900">
                          {personName(session.patient)}
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          MRN:{' '}
                          {session.patient?.mrn || '—'}
                        </p>
                      </div>

                      <StatusBadge
                        status={session.status}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Schedule
                        </span>

                        <span className="mt-0.5 block text-xs font-bold text-slate-700">
                          {formatDate(sessionDate)}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Station
                        </span>

                        <span className="mt-0.5 block truncate text-xs font-bold text-slate-700">
                          {session.chair?.code ||
                            session.chair
                              ?.chairNumber ||
                            'Not assigned'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Clock3 size={13} />
                      {formatTime(sessionDate)}
                    </div>
                  </button>
                );
              })
            )}

            {!loading &&
              filteredSessions.length === 0 && (
                <EmptyState
                  message={
                    view === 'scheduled'
                      ? 'No current or upcoming sessions found'
                      : 'No completed sessions found'
                  }
                />
              )}
          </div>
        </aside>

        <main className="min-w-0">
          {!selected ? (
            <div className="card flex min-h-[420px] items-center justify-center p-6">
              <EmptyState message="Select a session from the left to manage its treatment workflow" />
            </div>
          ) : (
            <div className="space-y-5">
              <section className="card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {personName(selected.patient)}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      MRN {selected.patient?.mrn || '—'} •
                      Station{' '}
                      {selected.chair?.code ||
                        selected.chair?.chairNumber ||
                        'Not assigned'}
                    </p>

                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>
                        Schedule{' '}
                        {selected.schedule?.code ||
                          selected.schedule?._id ||
                          selected.schedule ||
                          '—'}
                      </span>
                      {selected.schedule?.sessionCode && (
                        <span
                          className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white"
                          title="Station - Shift - Date"
                        >
                          {selected.schedule.sessionCode}
                        </span>
                      )}
                      {(selected.schedule?.shift ??
                        shiftIdFromTime(selected.schedule?.startTime)) && (
                        <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          {SHIFTS.find(
                            (sh) =>
                              sh.id ===
                              Number(
                                selected.schedule?.shift ??
                                  shiftIdFromTime(
                                    selected.schedule?.startTime
                                  )
                              )
                          )?.label}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge
                      status={selected.status}
                    />
                    <DialysisPrescriptionViewer
                      patientId={selected?.patient?._id || selected?.patient}
                      buttonClassName="btn-primary"
                    />
                  </div>
                </div>

                {/* Appointment / schedule detail */}
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-blue-800">
                    Schedule Detail
                  </p>
                  <div className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Appointment date
                      </span>
                      <b className="mt-1 block">
                        {selected.schedule?.date
                          ? new Date(selected.schedule.date).toLocaleDateString()
                          : '—'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Time
                      </span>
                      <b className="mt-1 block">
                        {selected.schedule?.startTime || '—'}
                        {selected.schedule?.endTime
                          ? ` - ${selected.schedule.endTime}`
                          : ''}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Shift
                      </span>
                      <b className="mt-1 block">
                        {SHIFTS.find(
                          (sh) =>
                            sh.id ===
                            Number(
                              selected.schedule?.shift ??
                                shiftIdFromTime(selected.schedule?.startTime)
                            )
                        )?.label || '—'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Station
                      </span>
                      <b className="mt-1 block">
                        {selected.chair?.code ||
                          selected.chair?.chairNumber ||
                          '—'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Booked by
                      </span>
                      <b className="mt-1 block">
                        {selected.schedule?.bookedByName || '—'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Checked in
                      </span>
                      <b className="mt-1 block">
                        {selected.checkedInAt
                          ? formatDateTime(selected.checkedInAt)
                          : 'Not checked in'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Duration
                      </span>
                      <b className="mt-1 block">
                        {selected.schedule?.durationHours
                          ? `${selected.schedule.durationHours} hr`
                          : '—'}
                      </b>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-400">
                        Session code
                      </span>
                      <b className="mt-1 block font-mono">
                        {selected.schedule?.sessionCode || '—'}
                      </b>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-semibold text-slate-400">
                      Created
                    </span>
                    <b className="mt-1 block">
                      {formatDateTime(selected.createdAt)}
                    </b>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-semibold text-slate-400">
                      Started
                    </span>
                    <b className="mt-1 block">
                      {formatDateTime(selected.startedAt)}
                    </b>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-semibold text-slate-400">
                      Submitted by technician
                    </span>
                    <b className="mt-1 block">
                      {selected.submittedForReviewAt
                        ? formatDateTime(selected.submittedForReviewAt)
                        : '—'}
                    </b>
                    {selected.submittedForReviewByName && (
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {selected.submittedForReviewByName}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-semibold text-slate-400">
                      Completed (nurse sign-off)
                    </span>
                    <b className="mt-1 block">
                      {selected.completedAt
                        ? formatDateTime(selected.completedAt)
                        : '—'}
                    </b>
                    {selected.nurseReview?.signatureName && (
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        Signed by {selected.nurseReview.signatureName}
                      </span>
                    )}
                  </div>
                </div>

                {isScheduled && (
                  <button
                    type="button"
                    className="btn-primary mt-4"
                    disabled={actionLoading}
                    onClick={() =>
                      action(
                        'Patient checked in',
                        () =>
                          sessionApi.checkIn(
                            selected._id
                          )
                      )
                    }
                  >
                    {actionLoading
                      ? 'Processing...'
                      : 'Check In Patient'}
                  </button>
                )}

                {isCheckedIn && (
                  <button
                    type="button"
                    className="btn-primary mt-4"
                    disabled={actionLoading}
                    onClick={() =>
                      action(
                        'Treatment started',
                        () =>
                          sessionApi.start(
                            selected._id
                          )
                      )
                    }
                  >
                    {actionLoading
                      ? 'Processing...'
                      : 'Start Treatment'}
                  </button>
                )}

                {isCompleted && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    This treatment is completed. The
                    information below is read-only.
                  </div>
                )}
              </section>

              {(isInProgress || isPendingReview) && (
                <>
                  {isPendingReview && (
                    <NurseReviewCard
                      session={selected}
                      canFinalize={['nurse', 'admin'].includes(user?.role)}
                      signature={signature}
                      setSignature={setSignature}
                      reviewNotes={reviewNotes}
                      setReviewNotes={setReviewNotes}
                      attested={attested}
                      setAttested={setAttested}
                      onFinalize={finalizeWithSignature}
                      loading={actionLoading}
                    />
                  )}

                  <div className="grid gap-5 2xl:grid-cols-2">
                    <section className="card p-5">
                      <h3 className="font-extrabold text-slate-900">
                        Add Vitals
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Record patient observations before,
                        during or after treatment.
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <FieldLabel>Phase</FieldLabel>
                          <select
                            className="input"
                            value={vitals.phase}
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                phase:
                                  event.target.value,
                              }))
                            }
                          >
                            <option value="before">
                              Before treatment
                            </option>
                            <option value="during">
                              During treatment
                            </option>
                            <option value="after">
                              After treatment
                            </option>
                          </select>
                        </div>

                        <div>
                          <FieldLabel>
                            Blood pressure
                          </FieldLabel>
                          <input
                            className="input"
                            placeholder="120/80"
                            value={
                              vitals.bloodPressure
                            }
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                bloodPressure:
                                  event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>
                            Heart rate
                          </FieldLabel>
                          <input
                            className="input"
                            type="number"
                            placeholder="BPM"
                            value={vitals.heartRate}
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                heartRate:
                                  event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>
                            Temperature
                          </FieldLabel>
                          <input
                            className="input"
                            type="number"
                            step="0.1"
                            placeholder="°F / °C"
                            value={vitals.temperature}
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                temperature:
                                  event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Weight</FieldLabel>
                          <input
                            className="input"
                            type="number"
                            step="0.1"
                            placeholder="kg"
                            value={vitals.weight}
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                weight:
                                  event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FieldLabel>SPO2</FieldLabel>
                          <input
                            className="input"
                            type="number"
                            placeholder="%"
                            value={vitals.spo2}
                            onChange={(event) =>
                              setVitals((current) => ({
                                ...current,
                                spo2:
                                  event.target.value,
                              }))
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="btn-primary sm:col-span-2"
                          onClick={saveVitals}
                          disabled={actionLoading}
                        >
                          {actionLoading
                            ? 'Saving...'
                            : 'Save Vitals'}
                        </button>
                      </div>
                    </section>

                    <section className="card p-5">
                      <h3 className="font-extrabold text-slate-900">
                        SOAP & Completion
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Save clinical notes before completing
                        the treatment.
                      </p>

                      <div className="mt-4 space-y-3">
                        <div>
                          <FieldLabel>Access site</FieldLabel>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="input w-auto"
                              value={soap.access}
                              onChange={(event) =>
                                setSoap((current) => ({
                                  ...current,
                                  access: event.target.value,
                                  accessOther: event.target.value === 'Other' ? current.accessOther : '',
                                }))
                              }
                            >
                              <option value="">Optional</option>
                              {accessTypesForRole(user?.role).map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                            {soap.access === 'Other' && (
                              <input
                                className="input flex-1"
                                placeholder="Specify access site"
                                value={soap.accessOther}
                                onChange={(event) => setSoap((c) => ({ ...c, accessOther: event.target.value }))}
                              />
                            )}
                          </div>
                        </div>

                        {Object.keys(BLANK_SOAP).filter((k) => k !== 'access' && k !== 'accessOther').map(
                          (key) => (
                            <div key={key}>
                              <FieldLabel>
                                {formatStatusLabel(key)}
                              </FieldLabel>

                              <textarea
                                className="input min-h-20 resize-y"
                                placeholder={`Enter ${key}`}
                                value={soap[key]}
                                onChange={(event) =>
                                  setSoap((current) => ({
                                    ...current,
                                    [key]:
                                      event.target.value,
                                  }))
                                }
                              />
                            </div>
                          )
                        )}

                        <button
                          type="button"
                          className="btn-light"
                          onClick={saveSoap}
                          disabled={actionLoading}
                        >
                          {actionLoading
                            ? 'Saving...'
                            : 'Save SOAP'}
                        </button>

                        <div className="border-t border-slate-100 pt-4">
                          <FieldLabel>
                            Treatment summary
                          </FieldLabel>

                          <textarea
                            className="input min-h-24 resize-y"
                            value={summary}
                            onChange={(event) =>
                              setSummary(
                                event.target.value
                              )
                            }
                          />

                          {isPendingReview ? (
                            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                              Review the record below, then sign and close this
                              session using the review panel at the top.
                            </p>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary mt-3"
                              onClick={completeAndClean}
                              disabled={actionLoading}
                            >
                              {actionLoading
                                ? (isTechnician ? 'Submitting...' : 'Completing...')
                                : (isTechnician
                                    ? 'Submit for Nurse Review'
                                    : 'Complete Treatment + Clean Station')}
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  <MedicationCard
                    allowMeds={allowMeds}
                    quickMeds={QUICK_MEDS}
                    units={COMMON_UNITS}
                    routes={MEDICATION_ROUTES}
                    meds={meds}
                    sessionMeds={sessionMeds}
                    savingMeds={savingMeds}
                    onMedField={setMedField}
                    onAddRow={addMedRow}
                    onRemoveRow={removeMedRow}
                    onSave={saveMeds}
                    onDelete={deleteSessionMed}
                    onCancel={cancelSessionMed}
                  />

                  <section className="card p-5">
                    <LabPanel
                      patientId={selected?.patient?._id || selected?.patient}
                      session={selected?._id}
                    />
                  </section>

                  {allowNote && (
                    <SessionNotesCard
                      accessTypes={accessTypesForRole(user?.role)}
                      noteForm={noteForm}
                      setNoteForm={setNoteForm}
                      onSave={saveNote}
                      saving={savingNote}
                      notes={sessionNotes}
                      onDelete={deleteNote}
                      patientId={selected?.patient?._id || selected?.patient}
                      sessionId={selected?._id}
                    />
                  )}

                  {allowHomeMed && (
  <section className="card p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-extrabold text-slate-900">
          Home Medications
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Medications the patient takes at home, separate from
          medications administered during dialysis.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <HomeMedQuickAdd onPick={quickAddHomeMed} />
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          {homeMeds.filter((m) => m.status === 'active').length} active
        </span>
      </div>
    </div>

    {/* Horizontal add medication form */}
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        Add a home medication
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        <input
          className="input md:col-span-3"
          placeholder="Medication name"
          value={homeMedForm.name}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
        />

        <input
          className="input md:col-span-1"
          type="number"
          min="0"
          step="any"
          placeholder="Dose"
          value={homeMedForm.dose}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              dose: event.target.value,
            }))
          }
        />

        <select
          className="input md:col-span-1"
          value={homeMedForm.unit}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              unit: event.target.value,
            }))
          }
        >
          {HOME_MED_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        <select
          className="input md:col-span-2"
          value={homeMedForm.route}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              route: event.target.value,
            }))
          }
        >
          {HOME_MED_ROUTES.map((route) => (
            <option key={route} value={route}>
              {route}
            </option>
          ))}
        </select>

        <select
          className="input md:col-span-3"
          value={homeMedForm.frequency}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              frequency: event.target.value,
            }))
          }
        >
          {HOME_MED_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency}
            </option>
          ))}
        </select>

        <input
          className="input md:col-span-2"
          type="number"
          min="1"
          placeholder="Quantity"
          value={homeMedForm.quantity}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              quantity: event.target.value,
            }))
          }
        />

        <input
          className="input md:col-span-6"
          placeholder="Prescribed by physician"
          value={homeMedForm.prescribedBy}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              prescribedBy: event.target.value,
            }))
          }
        />

        <input
          className="input md:col-span-6"
          placeholder="Notes (optional)"
          value={homeMedForm.notes}
          onChange={(event) =>
            setHomeMedForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={saveHomeMed}
          disabled={savingHomeMed}
        >
          {savingHomeMed
            ? 'Saving medication...'
            : '+ Add Home Medication'}
        </button>
      </div>
    </div>

    {/* Vertical saved medications list */}
    <HomeMedicationCard
      homeMeds={homeMeds}
      allowHomeMed={allowHomeMed}
      onStop={stopHomeMedInWorkflow}
      onDelete={deleteHomeMedInWorkflow}
    />
  </section>
)}

                 



                </>
              )}

              {isCompleted && (
                <section className="card space-y-5 p-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Treatment Summary
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Read-only record of the completed
                      treatment.
                    </p>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      [
                        'Patient',
                        personName(selected.patient),
                      ],
                      [
                        'MRN',
                        selected.patient?.mrn || '—',
                      ],
                      [
                        'Station',
                        selected.chair?.code ||
                          selected.chair
                            ?.chairNumber ||
                          '—',
                      ],
                      [
                        'Start',
                        formatDateTime(
                          selected.startedAt
                        ),
                      ],
                      [
                        'End',
                        formatDateTime(
                          selected.completedAt
                        ),
                      ],
                      [
                        'Duration',
                        durationMin !== null
                          ? `${durationMin} min`
                          : '—',
                      ],
                      ['Nurse', nurseName],
                      [
                        'Status',
                        formatStatusLabel(
                          selected.status
                        ),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-50 p-3"
                      >
                        <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
                          {label}
                        </span>

                        <span className="mt-1 block font-semibold text-slate-700">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">
                      Medications ({sessionMeds.filter((m) => (m.status || 'active') !== 'deleted').length})
                    </h4>

                    {sessionMeds.length ? (
                      <div className="mt-2 space-y-2">
                        {sessionMeds.map(
                          (medication) => {
                            const st = medication.status || 'active';
                            return (
                            <div
                              key={medication._id}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold ${st === 'deleted' ? 'bg-slate-100 text-slate-400 line-through' : st === 'cancelled' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}
                            >
                              {st === 'active' ? '✓' : st === 'cancelled' ? '⊘' : '✕'} {medication.name}{' '}
                              {medication.dose}{' '}
                              {medication.unit}
                              {medication.route
                                ? ` • ${medication.route}`
                                : ''}
                              {st === 'cancelled' && <span className="ml-1 text-xs font-normal">— stopped{medication.cancelReason ? `: ${medication.cancelReason}` : ''}</span>}
                            </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        None recorded.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                      Home Medications ({homeMeds.filter((m) => m.status === 'active').length})
                    </h4>

                    {homeMeds.length ? (
                      <div className="mt-2 space-y-2">
                        {homeMeds.map((medication) => {
                          const stopped = medication.status === 'discontinued' || medication.status === 'cancelled';
                          const removed = medication.status === 'deleted';
                          return (
                            <div
                              key={medication._id}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold ${removed ? 'bg-slate-100 text-slate-400 line-through' : stopped ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                            >
                              {!stopped && !removed ? '✓' : stopped ? '⊘' : '✕'} {medication.name}{' '}
                              {medication.dose}
                              {medication.unit ? ` ${medication.unit}` : ''}
                              {medication.frequency ? ` • ${medication.frequency}` : ''}
                              {stopped && <span className="ml-1 text-xs font-normal">— stopped{medication.cancelReason ? `: ${medication.cancelReason}` : ''}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        None recorded.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">
                      Vitals (
                      {selected.vitals?.length || 0})
                    </h4>

                    {selected.vitals?.length ? (
                      <div className="mt-2 space-y-2">
                        {selected.vitals.map(
                          (vital, index) => (
                            <div
                              key={index}
                              className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <b>
                                {formatStatusLabel(
                                  vital.phase ||
                                    'record'
                                )}
                                :
                              </b>{' '}
                              BP{' '}
                              {vital.bloodPressure ||
                                '—'}{' '}
                              • HR{' '}
                              {vital.heartRate || '—'}{' '}
                              • Temp{' '}
                              {vital.temperature ||
                                '—'}{' '}
                              • Weight{' '}
                              {vital.weight || '—'} •
                              SPO2 {vital.spo2 || '—'}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        None recorded.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">
                      SOAP
                    </h4>

                    {selected.soapNotes?.length ? (
                      <div className="mt-2 space-y-3">
                        {selected.soapNotes.map(
                          (soapNote, index) => (
                            <div
                              key={index}
                              className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <p>
                                <b>S:</b>{' '}
                                {soapNote.subjective ||
                                  '—'}
                              </p>
                              <p>
                                <b>O:</b>{' '}
                                {soapNote.objective ||
                                  '—'}
                              </p>
                              <p>
                                <b>A:</b>{' '}
                                {soapNote.assessment ||
                                  '—'}
                              </p>
                              <p>
                                <b>P:</b>{' '}
                                {soapNote.plan || '—'}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        No SOAP notes recorded.
                      </p>
                    )}
                  </div>

                  {sessionNotes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">
                        Session notes
                      </h4>

                      <div className="mt-2 space-y-2">
                        {sessionNotes.map((note) => (
                          <div
                            key={note._id}
                            className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
                          >
                            {note.accessType && (
                              <span className="mr-2 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                                {note.accessType}
                              </span>
                            )}

                            {note.comment}

                            <NoteAuthor
                              name={note.authorName}
                              role={note.authorRole}
                              at={note.createdAt}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.treatmentSummary && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <b>Treatment summary:</b>{' '}
                      {selected.treatmentSummary}
                    </div>
                  )}

                  {selected.documents?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">
                        Documents
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {selected.documents.map(
                          (document, index) => (
                            <span
                              key={`${document.fileUrl}-${index}`}
                              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600"
                            >
                              {document.name ||
                                `Document ${
                                  index + 1
                                }`}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
