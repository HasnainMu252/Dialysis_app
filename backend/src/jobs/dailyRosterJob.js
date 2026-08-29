import cron from 'node-cron';
import Patient from '../models/Patient.js';
import { notifyDailyRoster } from '../services/notificationService.js';

/** mwf = Mon/Wed/Fri, tts = Tue/Thu/Sat. */
const patternForWeekday = (w) => ([1, 3, 5].includes(w) ? 'mwf' : [2, 4, 6].includes(w) ? 'tts' : null);

/**
 * Every morning, post a notification to nurses/technicians summarising today's
 * dialysis roster (patient counts per shift), so they know who's coming.
 */
export const startDailyRosterJob = () => {
  const expr = process.env.DAILY_ROSTER_CRON || '0 5 * * *'; // 05:00 daily
  cron.schedule(expr, async () => {
    try {
      const pattern = patternForWeekday(new Date().getDay());
      if (!pattern) return; // Sunday: no roster

      const patients = await Patient.find({ status: 'active', dayPattern: pattern, shift: { $in: [1, 2, 3] } })
        .select('shift').lean();

      const counts = { 1: 0, 2: 0, 3: 0 };
      patients.forEach((p) => { if (counts[p.shift] !== undefined) counts[p.shift] += 1; });

      const label = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      await notifyDailyRoster(counts, label);
    } catch (err) {
      console.error('[daily-roster] job failed:', err.message);
    }
  });
  console.log(`[daily-roster] job registered (${expr})`);
};
