import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '../../components/common/EmptyState';
import { patientApi } from '../../api/patientApi';
import { SHIFTS, DAY_PATTERNS, dayPatternShort } from '../../constants';
import { personName } from '../../utils/format';
import { downloadExcel } from '../../utils/exportExcel';

/*
 * Shift-wise report — active patients grouped by their 1st / 2nd / 3rd dialysis
 * shift, with a Mon-Wed-Fri vs Tue-Thu-Sat day-pattern split and CSV export.
 */
export default function ShiftReport() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    patientApi.list({ limit: 1000 })
      .then((r) => setPatients(r.data?.data || []))
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to load patients'))
      .finally(() => setLoading(false));
  }, []);

  const byShift = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], none: [] };
    patients.forEach((p) => {
      const s = Number(p.shift);
      if (s === 1 || s === 2 || s === 3) map[s].push(p);
      else map.none.push(p);
    });
    return map;
  }, [patients]);

  const exportCsv = () => {
    const rows = [];
    SHIFTS.forEach((sh) => (byShift[sh.id] || []).forEach((p) => rows.push({
      shift: sh.label, mrn: p.mrn || '', patient: personName(p), days: dayPatternShort(p.dayPattern) || '', status: p.status || 'active',
    })));
    downloadExcel({
      title: 'Patients by Shift',
      sheetName: 'By Shift',
      filename: 'patients-by-shift',
      columns: [
        { header: 'Shift', key: 'shift', width: 14 },
        { header: 'MRN', key: 'mrn', width: 12 },
        { header: 'Patient', key: 'patient', width: 26 },
        { header: 'Days', key: 'days', width: 10 },
        { header: 'Status', key: 'status', width: 14 },
      ],
      rows,
    });
  };

  const patternCount = (list, id) => list.filter((p) => p.dayPattern === id).length;

  if (loading) return <div className="card p-6 text-center text-sm text-slate-400">Loading shift report…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{patients.length} patients grouped by dialysis shift.</p>
        <button type="button" onClick={exportCsv} disabled={!patients.length} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">Export CSV</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SHIFTS.map((sh) => {
          const list = byShift[sh.id] || [];
          return (
            <section key={sh.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{sh.label}</h3>
                  <p className="text-xs text-slate-500">{sh.time}</p>
                </div>
                <span className="rounded-full bg-[#123B5D] px-3 py-1 text-sm font-bold text-white">{list.length}</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {DAY_PATTERNS.map((d) => (
                  <span key={d.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{d.short}: {patternCount(list, d.id)}</span>
                ))}
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {list.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="truncate font-semibold text-slate-800">{personName(p)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{p.mrn} {p.dayPattern ? `• ${dayPatternShort(p.dayPattern)}` : ''}</span>
                  </div>
                ))}
                {!list.length && <EmptyState message="No patients in this shift" />}
              </div>
            </section>
          );
        })}
      </div>

      {byShift.none.length > 0 && (
        <section className="card p-5">
          <h3 className="mb-2 font-extrabold text-slate-900">No shift assigned ({byShift.none.length})</h3>
          <div className="flex flex-wrap gap-2">
            {byShift.none.map((p) => <span key={p._id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{personName(p)}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}
