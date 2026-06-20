import { CalendarDays, Clock, Armchair, Phone } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { dateOnly } from '../../utils/format';

/**
 * Easy-to-read schedule card.
 * Patient name is the headline; date & time are bold; whole card is clickable.
 */
export default function ScheduleCard({ schedule, index, onClick }) {
  const name = schedule.patientName || schedule.patient?.firstName
    ? `${schedule.patientName || ''}`.trim() || `${schedule.patient?.firstName || ''} ${schedule.patient?.lastName || ''}`.trim()
    : 'Unknown patient';
  const phone = schedule.patientPhone || schedule.patient?.phone;
  const chair = schedule.chair?.code || schedule.chair?.chairNumber || schedule.chairCode;
  const date = schedule.date;
  const time = schedule.startTime && schedule.endTime ? `${schedule.startTime} - ${schedule.endTime}` : null;

  return (
    <button
      onClick={onClick}
      className="card w-full p-4 text-left transition hover:border-blue-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {typeof index === 'number' && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{index}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-slate-900">{name}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{schedule.code} {phone ? `• ${phone}` : ''}</p>
          </div>
        </div>
        <StatusBadge status={schedule.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 text-slate-700"><CalendarDays size={15} className="text-blue-600" /><b className="font-bold">{date ? dateOnly(date) : '—'}</b></span>
        {time && <span className="inline-flex items-center gap-1.5 text-slate-700"><Clock size={15} className="text-blue-600" /><b className="font-bold">{time}</b></span>}
        {chair && <span className="inline-flex items-center gap-1.5 text-slate-500"><Armchair size={15} /> Chair {chair}</span>}
        {phone && <span className="inline-flex items-center gap-1.5 text-slate-500 sm:hidden"><Phone size={15} /> {phone}</span>}
      </div>
    </button>
  );
}
