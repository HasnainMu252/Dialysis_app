import StatusBadge from '../ui/StatusBadge';
import PatientBioPanel from './PatientBioPanel';
import { dateOnly, money } from '../../utils/format';

const VitalsTable = ({ vitals = [] }) => (
  <div className="overflow-x-auto rounded-xl border">
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-slate-500">
        <tr><th className="p-3">Phase</th><th>BP</th><th>HR</th><th>Temp</th><th>Weight</th><th>SPO2</th><th>Recorded</th></tr>
      </thead>
      <tbody>
        {vitals.map((v) => <tr className="border-t" key={v._id || `${v.phase}-${v.recordedAt}`}><td className="p-3 capitalize">{v.phase}</td><td>{v.bloodPressure || '-'}</td><td>{v.heartRate || '-'}</td><td>{v.temperature || '-'}</td><td>{v.weight || '-'}</td><td>{v.spo2 || '-'}</td><td>{dateOnly(v.recordedAt)}</td></tr>)}
        {!vitals.length && <tr><td className="p-3 text-slate-500" colSpan="7">No vitals recorded.</td></tr>}
      </tbody>
    </table>
  </div>
);

const SoapList = ({ notes = [] }) => (
  <div className="space-y-3">
    {notes.map((n, idx) => <div key={idx} className="rounded-xl border p-3 text-sm"><div className="mb-2 text-xs text-slate-500">{dateOnly(n.createdAt)}</div><div className="grid gap-2 md:grid-cols-2"><p><b>Subjective:</b> {n.subjective || '-'}</p><p><b>Objective:</b> {n.objective || '-'}</p><p><b>Assessment:</b> {n.assessment || '-'}</p><p><b>Plan:</b> {n.plan || '-'}</p></div></div>)}
    {!notes.length && <p className="text-sm text-slate-500">No SOAP notes recorded.</p>}
  </div>
);

export default function PatientJourneyPanel({ patient, schedules = [], sessions = [], claims = [], compact = false }) {
  if (!patient) return null;
  return (
    <div className="space-y-4">
      <PatientBioPanel patient={patient} claims={claims} compact={compact} />
      <section className="card p-5"><h3 className="mb-3 font-bold">Schedule History</h3><div className="space-y-2">{schedules.map((s) => <div className="rounded-xl border p-3 text-sm" key={s.id || s._id}><div className="flex justify-between gap-2"><b>{s.code}</b><StatusBadge status={s.status} /></div><p>{dateOnly(s.date)} • {s.startTime}-{s.endTime} • Chair {s.chair?.code || s.chairCode || '-'}</p></div>)}{!schedules.length && <p className="text-sm text-slate-500">No schedules found.</p>}</div></section>
      <section className="card p-5"><h3 className="mb-3 font-bold">Session History + Vitals/SOAP</h3><div className="space-y-4">{sessions.map((s) => <div className="rounded-xl border p-3" key={s._id}><div className="mb-3 flex justify-between gap-2"><div><b>{dateOnly(s.createdAt)}</b><p className="text-xs text-slate-500">Chair {s.chair?.code || s.chair?.chairNumber || s.chair || '-'}</p></div><StatusBadge status={s.status} /></div><p className="mb-3 text-sm">{s.treatmentSummary || 'No treatment summary yet.'}</p><VitalsTable vitals={s.vitals || []} /><div className="mt-3"><SoapList notes={s.soapNotes || []} /></div></div>)}{!sessions.length && <p className="text-sm text-slate-500">No sessions found.</p>}</div></section>
      <section className="card p-5"><h3 className="mb-3 font-bold">Claims / Payment</h3><div className="space-y-2">{claims.map((c) => <div className="rounded-xl border p-3 text-sm" key={c._id}><div className="flex justify-between gap-2"><b>{c.claimReference}</b><StatusBadge status={c.status} /></div><p>{c.month} • Rs {money(c.amount)} • Paid: Rs {money(c.paymentAmount || 0)}</p></div>)}{!claims.length && <p className="text-sm text-slate-500">No claims found.</p>}</div></section>
    </div>
  );
}
