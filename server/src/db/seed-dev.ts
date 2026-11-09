
import { randomUUID } from 'node:crypto';
import { sql } from './client.js';
import { hashPassword } from '../lib/security.js';

// Local development accounts only
const testUsers = [
  {
    name: 'Rahul Test',
    mobile: '+15550100001',
    role: 'user',
  },
  {
    name: 'Priya Test',
    mobile: '+15550100002',
    role: 'user',
  },
  {
    name: 'James Test',
    mobile: '+15550100003',
    role: 'user',
  },
  {
    name: 'AuthLab Admin',
    mobile: '+15550100004',
    role: 'super_admin',
  },
] as const;

async function seed() {
  // Prevent execution in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seeding is disabled in production');
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const parsedUrl = new URL(databaseUrl);

  // Only permit a direct local PostgreSQL connection
  const allowedHosts = ['localhost', '127.0.0.1', '[::1]'];

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    throw new Error(
      'Seed blocked: DATABASE_URL must point to local PostgreSQL'
    );
  }

  if (parsedUrl.pathname !== '/authlab') {
    throw new Error(
      'Seed blocked: expected local database named authlab'
    );
  }

  const userPassword = process.env.DEV_SEED_USER_PASSWORD;
  const adminPassword = process.env.DEV_SEED_ADMIN_PASSWORD;

  if (!userPassword || !adminPassword) {
    throw new Error(
      'Set DEV_SEED_USER_PASSWORD and DEV_SEED_ADMIN_PASSWORD in .env'
    );
  }

  console.log('Seeding local AuthLab users...');

  for (const user of testUsers) {
    const password =
      user.role === 'super_admin'
        ? adminPassword
        : userPassword;

    const passwordHash = await hashPassword(password);

    const result = await sql`
      INSERT INTO users (
        id,
        display_name,
        mobile,
        password_hash,
        status,
        role,
        mobile_verified_at,
        password_changed_at,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()},
        ${user.name},
        ${user.mobile},
        ${passwordHash},
        'active',
        ${user.role},
        NOW(),
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (mobile) DO NOTHING
      RETURNING id, display_name, mobile, role, status
    `;

    if (result.length > 0) {
      console.log(
        `CREATED: ${user.name} | ${user.mobile} | ${user.role}`
      );
    } else {
      console.log(
        `SKIPPED: ${user.mobile} already exists`
      );
    }
  }

  console.log('Development seeding completed.');
}

try {
  await seed();
} catch (error) {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
