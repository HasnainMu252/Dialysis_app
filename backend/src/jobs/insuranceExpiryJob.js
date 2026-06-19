import cron from 'node-cron';
import { checkInsuranceExpiryNotifications } from '../services/insuranceNotificationService.js';

export const startInsuranceExpiryJob = () => {
  cron.schedule(process.env.INSURANCE_EXPIRY_CRON || '0 9 * * *', async () => {
    await checkInsuranceExpiryNotifications();
  });
};
