import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { patientApi } from '../../api/patientApi';
import { useAuth } from '../../context/AuthContext';
import { canEditPatient } from '../../utils/permissions';
import { personName } from '../../utils/format';
import { shiftLabel, dayPatternShort } from '../../constants';

import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, {
  usePagedList,
} from '../../components/common/Pagination';

const patientKey = (patient) => patient._id || patient.id;

const exportRoles = [
  'admin',
  'insurance_person',
  'front_desk',
  'biller',
];

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 16V5m0 0L8 9m4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v5M14 11v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4.5 20c.8-4.1 3.2-6 7.5-6s6.7 1.9 7.5 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InsuranceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M12 9v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
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

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
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
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M6 4v5a4 4 0 0 0 8 0V4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 13v2a5 5 0 0 0 10 0v-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle
        cx="20"
        cy="11"
        r="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitials(patient) {
  const name = personName(patient) || 'Patient';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getPayer(patient) {
  return (
    patient.insurance?.payerName ||
    patient.insurance?.providerName ||
    'No payer'
  );
}

function getMemberId(patient) {
  return (
    patient.insurance?.memberId ||
    patient.insurance?.policyNumber ||
    'Not available'
  );
}

function getCoverageStatus(patient) {
  return (
    patient.insurance?.coverageStatus ||
    patient.insurance?.approvalStatus ||
    'not_submitted'
  );
}

function TableSkeleton({ allowEdit }) {
  return Array.from({ length: 6 }).map((_, index) => (
    <tr key={index} className="border-b border-slate-100">
      {allowEdit && (
        <td className="px-5 py-4">
          <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
        </td>
      )}

      <td className="px-5 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </td>

      <td className="px-5 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      </td>

      <td className="px-5 py-4">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
      </td>

      <td className="px-5 py-4">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200" />
      </td>
    </tr>
  ));
}

export default function PatientList() {
  const { user } = useAuth();

  const allowEdit = canEditPatient(user?.role);
  const allowExport = exportRoles.includes(user?.role);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [shiftFilter, setShiftFilter] = useState(searchParams.get('shift') || '');
  const [dayFilter, setDayFilter] = useState(searchParams.get('dayPattern') || '');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const selectedPatients = useMemo(
    () =>
      items.filter(
        (patient) => selected[patientKey(patient)]
      ),
    [items, selected]
  );

  const allSelected =
    items.length > 0 &&
    selectedPatients.length === items.length;

  const {
    paged: pagedItems,
    page,
    setPage,
    total: pagedTotal,
    pageCount,
  } = usePagedList(items, '', []);

  const load = async (searchValue = search) => {
    setLoading(true);

    try {
      const trimmedSearch = searchValue.trim();

      const params = {};
      if (trimmedSearch) params.search = trimmedSearch;
      if (shiftFilter) params.shift = shiftFilter;
      if (dayFilter) params.dayPattern = dayFilter;
      const response = await patientApi.list(params);

      const patients = response.data?.data || [];

      setItems(patients);

      setTotal(
        response.data?.meta?.total ??
          patients.length
      );

      setSelected({});
      setPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load patients'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
  }, []);

  // Re-fetch when the shift filter changes (skip the very first mount).
  const didMountShift = useRef(false);
  useEffect(() => {
    if (!didMountShift.current) {
      didMountShift.current = true;
      return;
    }
    load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftFilter, dayFilter]);

  const handleSearch = (event) => {
    event.preventDefault();
    load(search);
  };

  const clearSearch = () => {
    setSearch('');
    load('');
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }

    const nextSelected = {};

    items.forEach((patient) => {
      nextSelected[patientKey(patient)] = true;
    });

    setSelected(nextSelected);
  };

  const toggleOne = (patient) => {
    const key = patientKey(patient);

    setSelected((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const exportExcel = async () => {
    setExporting(true);

    try {
      const response = await patientApi.exportExcel(
        search.trim()
          ? {
              search: search.trim(),
            }
          : {}
      );

      const url = URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement('a');

      link.href = url;
      link.download = `patients-export-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      toast.success('Patient list exported successfully');
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Export failed'
      );
    } finally {
      setExporting(false);
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const validExtensions = [
      '.xlsx',
      '.xls',
      '.csv',
    ];

    const extension = file.name
      .slice(file.name.lastIndexOf('.'))
      .toLowerCase();

    if (!validExtensions.includes(extension)) {
      toast.error(
        'Please select an Excel or CSV file.'
      );

      event.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const response =
        await patientApi.bulkUpload(file);

      toast.success(
        response.data?.message ||
          'Bulk upload completed'
      );

      await load(search);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Bulk upload failed'
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cleanupOrphans = async () => {
    if (!window.confirm('Remove schedules and sessions left over from deleted patients?')) return;
    setCleaningOrphans(true);
    try {
      const res = await patientApi.cleanupOrphans();
      const d = res.data?.data || {};
      toast.success(`Cleaned up ${d.sessions || 0} session(s) and ${d.schedules || 0} schedule(s)`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cleanup failed');
    } finally {
      setCleaningOrphans(false);
    }
  };

  const bulkDelete = async () => {
    if (!selectedPatients.length) {
      toast.error('Select patients first');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedPatients.length} selected patient${
        selectedPatients.length > 1 ? 's' : ''
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const ids = selectedPatients
        .map((patient) => patient._id)
        .filter(Boolean);

      const mrns = selectedPatients
        .map((patient) =>
          String(patient.mrn || '').trim()
        )
        .filter(Boolean);

      const response =
        await patientApi.bulkDelete({
          ids,
          mrns,
        });

      toast.success(
        response.data?.message ||
          'Patients deleted successfully'
      );

      await load(search);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Bulk delete failed'
      );
    } finally {
      setDeleting(false);
    }
  };

  const deleteOne = async (patient) => {
    const confirmed = window.confirm(
      `Delete ${personName(
        patient
      )}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await patientApi.delete(patient._id);

      toast.success('Patient deleted successfully');

      await load(search);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Delete failed'
      );
    }
  };

  const patientDetailsLink = (patient) =>
    user?.role === 'doctor'
      ? `/doctor/patients/${patient._id}`
      : `/patients/${patient.mrn || patient._id}`;

  const doctorRoundLink = (patient) =>
    `/doctor/patients/${patient._id}?tab=doctor%20rounds&addRound=1`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Manage registration, insurance, treatment history and patient records."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'admin' && (
              <button
                onClick={cleanupOrphans}
                disabled={cleaningOrphans}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                title="Remove schedules/sessions left over from deleted patients"
              >
                {cleaningOrphans ? 'Cleaning...' : 'Clean up orphaned records'}
              </button>
            )}
            {allowEdit ? (
              <Link
                to="/patients/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <PlusIcon />
                Add Patient
              </Link>
            ) : null}
          </div>
        }
      />

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-500/10">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                Total patients
              </p>

              <p className="mt-2 text-3xl font-black">
                {loading ? '—' : total}
              </p>

              <p className="mt-1 text-xs text-blue-100">
                Registered patient records
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <UserIcon />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current results
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {loading ? '—' : items.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Patients in this result
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <SearchIcon />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected records
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {selectedPatients.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ready for bulk action
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckIcon />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your access
              </p>

              <p className="mt-2 text-lg font-black capitalize text-slate-900">
                {(user?.role || 'Viewer').replaceAll(
                  '_',
                  ' '
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {allowEdit
                  ? 'Patient editing enabled'
                  : 'View-only patient access'}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <InsuranceIcon />
            </div>
          </div>
        </div>
      </section>

      {/* Search and toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 xl:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, phone, MRN, member ID or payer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Searching...
              </>
            ) : (
              <>
                <SearchIcon />
                Search
              </>
            )}
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[
              ['', 'All'],
              ['1', '1st'],
              ['2', '2nd'],
              ['3', '3rd'],
            ].map(([val, lbl]) => (
              <button
                key={val || 'all'}
                type="button"
                onClick={() => setShiftFilter(val)}
                title={val ? `Shift ${lbl}` : 'All shifts'}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  shiftFilter === val
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[
              ['', 'All days'],
              ['mwf', 'MWF'],
              ['tts', 'TTS'],
            ].map(([val, lbl]) => (
              <button
                key={val || 'alldays'}
                type="button"
                onClick={() => setDayFilter(val)}
                title={val === 'mwf' ? 'Mon / Wed / Fri' : val === 'tts' ? 'Tue / Thu / Sat' : 'All days'}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  dayFilter === val
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {allowExport && (
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Export Excel
                </>
              )}
            </button>
          )}

          {allowEdit && (
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon />
                  Bulk Upload
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={uploadFile}
          />
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            Press Enter to search. Excel upload
            accepts XLSX, XLS and CSV files.
          </p>

          {allowEdit && items.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 transition hover:text-blue-900"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border ${
                  allSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {allSelected && <CheckIcon />}
              </span>

              {allSelected
                ? 'Unselect all patients'
                : 'Select all patients'}
            </button>
          )}
        </div>
      </section>

      {/* Selected records action bar */}
      {allowEdit &&
        selectedPatients.length > 0 && (
          <section className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <CheckIcon />
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  {selectedPatients.length}{' '}
                  patient
                  {selectedPatients.length > 1
                    ? 's'
                    : ''}{' '}
                  selected
                </p>

                <p className="text-xs text-slate-500">
                  You can delete all selected records
                  together.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelected({})}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear selection
              </button>

              <button
                type="button"
                onClick={bulkDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon />
                    Delete selected
                  </>
                )}
              </button>
            </div>
          </section>
        )}

      {/* Desktop table */}
      <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">
              Patient directory
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {loading
                ? 'Loading patient records...'
                : `${pagedTotal} patient record${
                    pagedTotal === 1 ? '' : 's'
                  } found`}
            </p>
          </div>

          {search && (
            <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Search: “{search}”
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                {allowEdit && (
                  <th className="w-16 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all patients"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}

                <th className="px-5 py-4">MRN</th>
                <th className="px-5 py-4">
                  Patient
                </th>
                <th className="px-5 py-4">
                  Phone
                </th>
                <th className="px-5 py-4">
                  Address
                </th>
                <th className="px-5 py-4">
                  Insurance / payer
                </th>
                <th className="px-5 py-4">
                  Coverage
                </th>
                <th className="px-5 py-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <TableSkeleton
                  allowEdit={allowEdit}
                />
              ) : (
                pagedItems.map((patient) => {
                  const key = patientKey(patient);
                  const isSelected =
                    Boolean(selected[key]);

                  return (
                    <tr
                      key={key}
                      className={`border-b border-slate-100 transition last:border-0 ${
                        isSelected
                          ? 'bg-blue-50/60'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {allowEdit && (
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleOne(patient)
                            }
                            aria-label={`Select ${personName(
                              patient
                            )}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-700">
                          {patient.mrn || 'No MRN'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-sm font-black text-blue-700">
                            {getInitials(patient)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">
                              {personName(patient)}
                              {patient.shift ? (
                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {shiftLabel(patient.shift)}
                                </span>
                              ) : null}
                              {patient.dayPattern ? (
                                <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                  {dayPatternShort(patient.dayPattern)}
                                </span>
                              ) : null}
                              {patient.dayPattern && patient.shift && !(patient.recurring?.stoppedAt && patient.recurring?.active === false) ? (
                                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700" title="Recurring schedule active">
                                  ↻ Auto
                                </span>
                              ) : null}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {patient.email ||
                                'No email address'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {patient.phone || '—'}
                      </td>

                      <td className="max-w-[220px] px-5 py-4">
                        <p
                          className="truncate text-slate-600"
                          title={
                            patient.address ||
                            'No address'
                          }
                        >
                          {patient.address || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {getPayer(patient)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {getMemberId(patient)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={getCoverageStatus(
                            patient
                          )}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={patientDetailsLink(
                              patient
                            )}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            <EyeIcon />
                            {allowEdit
                              ? 'View / Edit'
                              : 'View'}
                          </Link>

                          {user?.role ===
                            'doctor' && (
                            <Link
                              to={doctorRoundLink(
                                patient
                              )}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <StethoscopeIcon />
                              Add SOAP
                            </Link>
                          )}

                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                deleteOne(patient)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-700"
                              aria-label={`Delete ${personName(
                                patient
                              )}`}
                              title="Delete patient"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile cards */}
      <section className="space-y-3 md:hidden">
        {loading &&
          Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  </div>

                  <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
                </div>

                <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
            )
          )}

        {!loading &&
          pagedItems.map((patient) => {
            const key = patientKey(patient);
            const isSelected =
              Boolean(selected[key]);

            return (
              <article
                key={key}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  isSelected
                    ? 'border-blue-300 ring-2 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {allowEdit && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleOne(patient)
                          }
                          aria-label={`Select ${personName(
                            patient
                          )}`}
                          className="mt-3 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 font-black text-blue-700">
                        {getInitials(patient)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">
                          {personName(patient)}
                        </h3>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {patient.mrn ||
                            'No MRN'}{' '}
                          ·{' '}
                          {patient.phone ||
                            'No phone'}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={getCoverageStatus(
                        patient
                      )}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Address
                      </p>

                      <p className="mt-1 text-slate-700">
                        {patient.address ||
                          'No address provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Payer
                        </p>

                        <p className="mt-1 truncate font-semibold text-slate-700">
                          {getPayer(patient)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Member ID
                        </p>

                        <p className="mt-1 truncate font-semibold text-slate-700">
                          {getMemberId(patient)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
                  <Link
                    to={patientDetailsLink(patient)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    <EyeIcon />
                    {allowEdit
                      ? 'View / Edit'
                      : 'View patient'}
                  </Link>

                  {user?.role === 'doctor' && (
                    <Link
                      to={doctorRoundLink(patient)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      <StethoscopeIcon />
                      Add SOAP
                    </Link>
                  )}

                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteOne(patient)
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                      aria-label={`Delete ${personName(
                        patient
                      )}`}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </section>

      {!items.length && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState
            message={
              search
                ? `No patients found for “${search}”`
                : 'No patients found'
            }
          />

          {search && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Pagination
            page={page}
            pageCount={pageCount}
            total={pagedTotal}
            onPage={setPage}
            label="patients"
          />
        </div>
      )}
    </div>
  );
}