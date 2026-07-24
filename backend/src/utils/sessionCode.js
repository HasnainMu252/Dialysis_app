import { SHIFTS, toMinutes } from './constants.js';

/**
 * Resolve the STATION number used in a session code.
 * Preference order:
 *   1. digits in the chair's auto-generated chairNumber ("CH-07" -> 7)
 *   2. digits in the chair code the user typed ("ST-3" -> 3)
 *   3. the raw code, uppercased, when it contains no digits at all
 */
export const stationNumberFrom = (chairDoc, chairCodeFallback) => {
  const fromNumber = String(chairDoc?.chairNumber || '').match(/(\d+)\s*$/);
  if (fromNumber) return String(Number(fromNumber[1]));

  const fromCode = String(chairDoc?.code || chairCodeFallback || '').match(/(\d+)\s*$/);
  if (fromCode) return String(Number(fromCode[1]));

  const raw = String(chairDoc?.code || chairCodeFallback || '').trim().toUpperCase();
  return raw || '?';
};

/** Format a date as DD-MM-YYYY (e.g. 23-07-2026). */
export const formatDMY = (date) => {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
};

/**
 * Resolve the shift (slot) for a start time, never returning null for a
 * real time-of-day: times before the first shift clamp to shift 1, times
 * after the last shift clamp to the last shift, and gap times (station
 * cleaning/buffer) roll forward into the upcoming shift.
 */
export const slotFor = (startTime) => {
  const mins = toMinutes(startTime);
  if (mins === null) return null;

  for (const s of SHIFTS) {
    if (mins >= toMinutes(s.start) && mins < toMinutes(s.end)) return s.id;
  }
  for (const s of SHIFTS) {
    if (mins < toMinutes(s.start)) return s.id;
  }
  return SHIFTS[SHIFTS.length - 1].id;
};

/**
 * Build the human-facing session code: {station}-{slot}-{DD-MM-YYYY}
 * e.g. station 1, 1st shift, 23 Jul 2026 -> "1-1-23-07-2026"
 */
export const buildSessionCode = ({ chairDoc, chairCode, startTime, date, shift }) => {
  const station = stationNumberFrom(chairDoc, chairCode);
  const slot = shift ?? slotFor(startTime) ?? '';
  const dmy = formatDMY(date);
  return `${station}-${slot}-${dmy}`;
};
