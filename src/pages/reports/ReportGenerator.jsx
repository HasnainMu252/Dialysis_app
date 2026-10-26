import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, SlidersHorizontal } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { medicationApi } from '../../api/medicationApi';
import { patientApi } from '../../api/patientApi';
import { sessionApi } from '../../api/sessionApi';
import { doctorApi } from '../../api/doctorApi';
import { orderApi } from '../../api/orderApi';
import { cqiApi } from '../../api/cqiApi';
import { SHIFTS, shiftLabel, shiftIdFromTime, dayPatternShort } from '../../constants';
import { accessTypeLabel } from '../../constants/vascularAccess';
import { personName, dateOnly } from '../../utils/format';
import { downloadExcel } from '../../utils/exportExcel';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Report types — each reports over data the system already stores.
const REPORT_TYPES = [
  { key: 'patients', label: 'Patients Roster', monthly: false, shift: true },
  { key: 'sessions', label: 'Dialysis Sessions & Vitals', monthly: true, shift: true },
  { key: 'rounds', label: 'Doctor Rounds (SOAP)', monthly: true, shift: false },
  { key: 'medication', label: 'Medication Administration', monthly: true, shift: true },
  { key: 'vascular', label: 'Vascular Access', monthly: false, shift: true },
  { key: 'dietitian', label: 'Dietitian Labs (Bone/Non-bone)', monthly: false, shift: false },
  { key: 'cqi', label: 'CQI Comments', monthly: true, shift: false },
  { key: 'orders', label: 'Orders (Meds/Equipment)', monthly: true, shift: false },
];

const inMonth = (d, month, year) => {
  if (!d) return false;
  const x = new Date(d);
  return x.getMonth() === month - 1 && x.getFullYear() === year;
};

const vitalOf = (session, phase) => (session.vitals || []).find((v) => v.phase === phase) || {};

/*
 * Unified report generator over existing modules. Pick a report type, set the
 * shared filters (month/year, shift, patient), view the table and download the
 * filtered rows as an Excel-compatible CSV. No new data is invented.
 */
export default function ReportGenerator() {
  const [reportType, setReportType] = useState('patients');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [shift, setShift] = useState('');
  const [search, setSearch] = useState('');

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const def = REPORT_TYPES.find((r) => r.key === reportType) || REPORT_TYPES[0];

  const load = async () => {
    setLoading(true);
    try {
      const pts = (await patientApi.list({ limit: 1000 })).data?.data || [];
      const shiftByMrn = {};
      pts.forEach((p) => { if (p.mrn) shiftByMrn[p.mrn] = p.shift; });
      let cols = [];
      let rws = [];

      if (reportType === 'patients') {
        cols = [
          { key: 'mrn', label: 'MRN' }, { key: 'name', label: 'Patient' }, { key: 'shift', label: 'Shift' },
          { key: 'pattern', label: 'Days' }, { key: 'access', label: 'Access Type' }, { key: 'status', label: 'Status' }, { key: 'phone', label: 'Phone' },
        ];
        rws = pts.map((p) => ({
          _shift: p.shift, mrn: p.mrn || '', name: personName(p), shift: shiftLabel(p.shift) || '—',
          pattern: dayPatternShort(p.dayPattern) || '—',
          access: accessTypeLabel(p.vascularAccess?.accessType) || p.medicalHistory?.accessType || '—',
          status: p.status || 'active', phone: p.phone || '',
        }));
      } else if (reportType === 'vascular') {
        cols = [
          { key: 'mrn', label: 'MRN' }, { key: 'name', label: 'Patient' }, { key: 'access', label: 'Access Type' },
          { key: 'location', label: 'Location' }, { key: 'status', label: 'Access Status' }, { key: 'placed', label: 'Placement' }, { key: 'maintained', label: 'Last Maintained' },
        ];
        rws = pts.map((p) => {
          const va = p.vascularAccess || {};
          return {
            _shift: p.shift, mrn: p.mrn || '', name: personName(p),
            access: accessTypeLabel(va.accessType) || p.medicalHistory?.accessType || '—',
            location: va.location || '—', status: va.status || '—',
            placed: va.placementDate ? dateOnly(va.placementDate) : '—',
            maintained: va.lastAssessmentDate ? dateOnly(va.lastAssessmentDate) : '—',
          };
        });
      } else if (reportType === 'dietitian') {
        const m = (x) => (x?.value ? `${x.value}${x.comment ? ` (${x.comment})` : ''}` : '—');
        cols = [
          { key: 'mrn', label: 'MRN' }, { key: 'name', label: 'Patient' },
          { key: 'calcium', label: 'Calcium' }, { key: 'phos', label: 'Phosphorous' }, { key: 'pth', label: 'PTH' },
          { key: 'vda', label: 'Vit D analog' }, { key: 'vd2', label: 'Vit D2' },
          { key: 'albumin', label: 'Albumin' }, { key: 'protein', label: 'Protein' },
        ];
        rws = pts
          .filter((p) => p.dietitianAssessment && (p.dietitianAssessment.bone || p.dietitianAssessment.nonBone))
          .map((p) => {
            const b = p.dietitianAssessment?.bone || {}; const nb = p.dietitianAssessment?.nonBone || {};
            return {
              _shift: p.shift, mrn: p.mrn || '', name: personName(p),
              calcium: m(b.calcium), phos: m(b.phosphorous), pth: m(b.pth), vda: m(b.vitaminDAnalog), vd2: m(b.vitaminD2),
              albumin: m(nb.albumin), protein: m(nb.protein),
            };
          });
      } else if (reportType === 'sessions') {
        const sessions = (await sessionApi.list({ includeExpired: 1 })).data?.data || [];
        cols = [
          { key: 'date', label: 'Date' }, { key: 'name', label: 'Patient' }, { key: 'status', label: 'Status' }, { key: 'shift', label: 'Shift' },
          { key: 'pre', label: 'Pre Wt' }, { key: 'post', label: 'Post Wt' }, { key: 'delta', label: 'Δ Wt' }, { key: 'bp', label: 'BP' }, { key: 'hr', label: 'HR' },
        ];
        rws = sessions
          .filter((s) => inMonth(s.schedule?.date || s.createdAt, month, year))
          .map((s) => {
            const before = vitalOf(s, 'before'); const after = vitalOf(s, 'after');
            const sh = s.schedule?.shift ?? shiftIdFromTime(s.schedule?.startTime) ?? s.patient?.shift;
            return {
              _shift: sh, date: dateOnly(s.schedule?.date || s.createdAt), name: personName(s.patient), status: s.status || '—',
              shift: shiftLabel(sh) || '—',
              pre: before.preWeight || before.weight || '—', post: after.postWeight || after.weight || '—',
              delta: after.deltaWeight ?? '—', bp: before.bloodPressure || '—', hr: before.heartRate || '—',
            };
          });
      } else if (reportType === 'rounds') {
        const checkups = (await doctorApi.listCheckups({ month, year })).data?.data || [];
        cols = [
          { key: 'date', label: 'Date' }, { key: 'name', label: 'Patient' }, { key: 'mrn', label: 'MRN' },
          { key: 'round', label: 'Round' }, { key: 'status', label: 'Status' }, { key: 'doctor', label: 'Doctor' },
        ];
        rws = checkups.map((c) => ({
          _shift: shiftByMrn[c.patientMrn], date: c.checkupDate ? dateOnly(c.checkupDate) : '—',
          name: c.patient ? personName(c.patient) : (c.patientMrn || '—'), mrn: c.patientMrn || c.patient?.mrn || '',
          round: `Round ${c.roundNumber}`, status: c.status || 'completed', doctor: c.doctor?.name || c.doctorName || '—',
        }));
      } else if (reportType === 'medication') {
        const rep = (await medicationApi.report({ month, year })).data?.data || { columns: [], rows: [] };
        cols = [{ key: 'name', label: 'Patient' }, { key: 'mrn', label: 'MRN' }, { key: 'shift', label: 'Shift' }, { key: 'hd', label: 'HD' },
          ...(rep.columns || []).map((c) => ({ key: `med_${c}`, label: c }))];
        rws = (rep.rows || []).map((r) => {
          const row = { _shift: shiftByMrn[r.mrn], name: r.patientName, mrn: r.mrn, shift: shiftLabel(shiftByMrn[r.mrn]) || '—', hd: r.hdQty ?? 0 };
          (rep.columns || []).forEach((c) => { row[`med_${c}`] = r.meds?.[c] || 0; });
          return row;
        });
      } else if (reportType === 'cqi') {
        const list = (await cqiApi.reviewAll({ month, year })).data?.data || [];
        cols = [
          { key: 'date', label: 'Date' }, { key: 'name', label: 'Patient' }, { key: 'author', label: 'Name' },
          { key: 'role', label: 'Role' }, { key: 'phase', label: 'Phase' }, { key: 'comment', label: 'Comment' },
        ];
        rws = list.map((r) => ({
          _shift: shiftByMrn[r.patient?.mrn || r.patientMrn], date: r.createdAt ? dateOnly(r.createdAt) : '—',
          name: personName(r.patient) || r.patientMrn || '—', author: r.authorName || '—',
          role: (r.authorRole || '').replace('_', ' '), phase: r.phase || 'general', comment: r.comment || '',
        }));
      } else if (reportType === 'orders') {
        const list = (await orderApi.list({ month, year })).data?.data || [];
        cols = [
          { key: 'date', label: 'Date' }, { key: 'category', label: 'Category' }, { key: 'name', label: 'Order' },
          { key: 'qty', label: 'Qty' }, { key: 'status', label: 'Status' }, { key: 'by', label: 'Ordered by' },
        ];
        rws = list.map((o) => ({
          date: o.orderDate ? dateOnly(o.orderDate) : '—', category: o.category, name: o.name, qty: o.quantity ?? 1,
          status: o.status, by: o.orderedByName || '—',
        }));
      }

      setColumns(cols);
      setRows(rws);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to generate report');
      setColumns([]); setRows([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [reportType, month, year]);

  // Client filters: shift (where the row carries one) + free-text search.
  const filtered = useMemo(() => {
    let out = rows;
    if (def.shift && shift) out = out.filter((r) => String(r._shift) === String(shift));
    const kw = search.trim().toLowerCase();
    if (kw) out = out.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(kw)));
    return out;
  }, [rows, shift, search, def.shift]);

  const { paged, page, setPage, total, pageCount } = usePagedList(filtered, '', []);

  const download = () => {
    const label = (REPORT_TYPES.find((r) => r.key === reportType) || {}).label || 'Report';
    downloadExcel({
      title: `${label}${def.monthly ? ` — ${MONTHS[month - 1]} ${year}` : ''}${shift ? ` · Shift ${shift}` : ''}`,
      sheetName: label.slice(0, 28),
      filename: `${reportType}-report-${year}-${String(month).padStart(2, '0')}${shift ? `-shift${shift}` : ''}`,
      columns: columns.map((c) => ({ header: c.label, key: c.key })),
      rows: filtered,
    });
  };

  const years = [year + 1, year, year - 1].filter((y, i, a) => a.indexOf(y) === i);

  return (
    <div className="space-y-4">
      {/* UNIFIED FILTER BAR */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900"><SlidersHorizontal size={16} className="text-[#123B5D]" /> Report filters</div>
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label">Report</label><select className="input" value={reportType} onChange={(e) => { setReportType(e.target.value); setShift(''); }}>{REPORT_TYPES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          {def.monthly && <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>}
          {def.monthly && <div><label className="label">Year</label><select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>}
          {def.shift && <div><label className="label">Shift</label><select className="input" value={shift} onChange={(e) => setShift(e.target.value)}><option value="">All shifts</option>{SHIFTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>}
          <div className="min-w-[180px] flex-1"><label className="label">Search</label><input className="input" placeholder="Any field…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn-primary inline-flex items-center gap-2" onClick={download}><Download size={16} /> Download Excel</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{filtered.length} row{filtered.length === 1 ? '' : 's'} — the download contains exactly these rows.</p>
      </div>

      {/* RESULTS */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>{columns.map((c) => <th key={c.key} className="px-3 py-3">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {paged.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-3 text-slate-700">{r[c.key] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-center text-sm text-slate-400">Generating…</p>}
        {!loading && !filtered.length && <EmptyState message="No data for these filters" />}
        <div className="p-2"><Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} label="rows" /></div>
      </div>
    </div>
  );
}
