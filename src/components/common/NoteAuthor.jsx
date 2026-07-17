import { UserRound } from 'lucide-react';

const ROLE_STYLES = {
  nurse: 'bg-blue-100 text-blue-800',
  technician: 'bg-amber-100 text-amber-800',
  doctor: 'bg-purple-100 text-purple-800',
  admin: 'bg-slate-200 text-slate-800',
};

const ROLE_LABELS = {
  nurse: 'Nurse',
  technician: 'Technician',
  doctor: 'Doctor',
  admin: 'Admin',
};

/**
 * Shows who authored a session note, e.g. "Nurse · Sarah Ahmed · 12 Jul, 3:04 PM".
 * The role is derived from the note's stored authorRole, so a note added by a
 * nurse reads "Nurse" and one added by a technician reads "Technician".
 */
export default function NoteAuthor({ name, role, at }) {
  const label = ROLE_LABELS[role] || role || 'Staff';
  const style = ROLE_STYLES[role] || 'bg-slate-100 text-slate-700';

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${style}`}>
        <UserRound size={11} /> {label}
      </span>
      <span className="font-semibold text-slate-600">{name || 'Unknown'}</span>
      {at && <span className="text-slate-400">· {new Date(at).toLocaleString()}</span>}
    </div>
  );
}
