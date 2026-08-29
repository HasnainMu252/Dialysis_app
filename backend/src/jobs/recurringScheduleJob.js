import cron from 'node-cron';
import { generateRecurringForAll } from '../services/recurringScheduleService.js';

/**
 * Daily sweep that tops up recurring dialysis schedules for all patients with
 * an active recurring booking, keeping the horizon filled so the pattern
 * repeats indefinitely until stopped.
 */
export const startRecurringScheduleJob = () => {
  const expr = process.env.RECURRING_SCHEDULE_CRON || '0 1 * * *'; // 01:00 daily
  cron.schedule(expr, async () => {
    try {
      const created = await generateRecurringForAll();
      if (created) console.log(`[recurring] generated ${created} schedule(s)`);
    } catch (err) {
      console.error('[recurring] job failed:', err.message);
    }
  });
  console.log(`[recurring] schedule job registered (${expr})`);
};
