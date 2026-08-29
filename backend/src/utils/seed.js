import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ROLES } from './constants.js';

/**
 * Seed one login account per role with KNOWN credentials.
 *
 * Run:  npm run seed
 *
 * Idempotent: existing accounts (matched by email) are updated in place and the
 * password is reset to the value below, so re-running always gives you a known
 * working set. Passwords are hashed by the User model's pre-save hook.
 *
 * Override the shared password without editing this file:
 *   SEED_PASSWORD='YourPass123' npm run seed
 *   SEED_EMAIL_DOMAIN='clinic.com' npm run seed
 */

const PASSWORD = process.env.SEED_PASSWORD || 'Passw0rd!';
const DOMAIN = process.env.SEED_EMAIL_DOMAIN || 'aegle.care';

const ACCOUNTS = [
  { role: ROLES.ADMIN,            name: 'System Admin',        local: 'admin' },
  { role: ROLES.FRONT_DESK,      name: 'Front Desk',          local: 'frontdesk' },
  { role: ROLES.BILLER,          name: 'Billing Officer',     local: 'biller' },
  { role: ROLES.INSURANCE_PERSON, name: 'Insurance Officer',  local: 'insurance' },
  { role: ROLES.NURSE,           name: 'Head Nurse',          local: 'nurse' },
  { role: ROLES.TECHNICIAN,      name: 'Dialysis Technician', local: 'technician' },
  { role: ROLES.SOCIAL_WORKER,   name: 'Social Worker',       local: 'socialworker' },
  { role: ROLES.DOCTOR,          name: 'Attending Physician', local: 'doctor' },
  { role: ROLES.PATIENT,         name: 'Demo Patient',        local: 'patient' },
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('No Mongo connection string found. Set MONGO_URI (or MONGODB_URI / DATABASE_URL) in your .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected. Seeding accounts...\n');

  const created = [];

  for (const acc of ACCOUNTS) {
    const email = `${acc.local}@${DOMAIN}`.toLowerCase();

    let user = await User.findOne({ email }).select('+password');
    if (user) {
      user.name = acc.name;
      user.role = acc.role;
      user.password = PASSWORD; // re-hashed by pre-save hook
      user.isActive = true;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      created.push({ email, role: acc.role, status: 'updated' });
    } else {
      await User.create({ name: acc.name, email, password: PASSWORD, role: acc.role, isActive: true });
      created.push({ email, role: acc.role, status: 'created' });
    }
  }

  console.log('Done. Accounts (all share the same password):\n');
  console.log(`  Password: ${PASSWORD}\n`);
  console.log('  ROLE'.padEnd(20) + 'EMAIL'.padEnd(34) + 'STATUS');
  console.log('  ' + '-'.repeat(58));
  created.forEach((c) => {
    console.log('  ' + c.role.padEnd(18) + c.email.padEnd(34) + c.status);
  });
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
