import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FileText, Pill, Stethoscope, Activity } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { patientApi } from '../../api/patientApi';
import api from '../../api/axios';
import { personName } from '../../utils/format';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const REPORTS = [
  { key: 'medication', label: 'Medication Report', url: '/medications/report', file: 'medication', icon: Pill, color: 'text-rose-600' },
  { key: 'rounds', label: 'Doctor Rounds Report', url: '/reports/soap/monthly', file: 'doctor-rounds', icon: Stethoscope, color: 'text-blue-600' },
  { key: 'dialysis', label: 'Dialysis Report', url: '/reports/dialysis-billing', file: 'dialysis', icon: Activity, color: 'text-emerald-600' },
];

export default function IndividualPatientReport() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [patient, setPatient] = useState(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState('');

  useEffect(() => {
    patientApi.list().then((r) => setPatients(r.data?.data || [])).catch(() => setPatients([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 20);
    return patients.filter((p) => `${personName(p)} ${p.mrn} ${p.phone}`.toLowerCase().includes(q)).slice(0, 20);
  }, [patients, search]);

  const download = async (report, fmt) => {
    if (!patient) { toast.error('Select a patient first'); return; }
    setBusy(`${report.key}-${fmt}`);
    try {
      const res = await api.get(report.url, { params: { patient: patient._id, month, year, format: fmt }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.file}-${patient.mrn || patient._id}-${year}-${String(month).padStart(2, '0')}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Export failed');
    } finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Individual Patient Report" subtitle="Generate a whole-month report for one patient — medication, doctor rounds or dialysis." />

      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className="label">Find Patient</label><input className="input" placeholder="Name, MRN or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-bold text-slate-700">Select a patient</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button key={p._id} onClick={() => setPatient(p)} className={`rounded-2xl border p-3 text-left transition ${patient?._id === p._id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <p className="truncate font-bold text-slate-900">{personName(p)}</p>
              <p className="truncate text-xs text-slate-500">{p.mrn} • {p.phone || 'No phone'}</p>
            </button>
          ))}
          {!filtered.length && <p className="text-sm text-slate-400">No patients match.</p>}
        </div>
      </div>

      {patient && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600"><FileText size={16} /> Reports for <b className="text-slate-900">{personName(patient)}</b> ({patient.mrn}) — {MONTHS[month - 1]} {year}</div>
          <div className="grid gap-3 md:grid-cols-3">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.key} className="rounded-2xl border border-slate-200 p-4">
                  <div className={`mb-3 flex items-center gap-2 font-bold ${r.color}`}><Icon size={18} /> {r.label}</div>
                  <div className="flex gap-2">
                    <button className="btn-primary inline-flex items-center gap-1 text-xs" onClick={() => download(r, 'xlsx')} disabled={busy === `${r.key}-xlsx`}><Download size={14} /> Excel</button>
                    <button className="btn-light inline-flex items-center gap-1 text-xs" onClick={() => download(r, 'csv')} disabled={busy === `${r.key}-csv`}><Download size={14} /> CSV</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
