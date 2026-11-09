import { sql } from './client.js';
import { hashPassword } from '../lib/security.js';

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Only allowed in development');
  }

  const dbUrl = new URL(process.env.DATABASE_URL ?? '');

  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(dbUrl.hostname) ||
    dbUrl.pathname !== '/authlab'
  ) {
    throw new Error('A local authlab database is required');
  }

  const mobile = process.env.DEV_PASSWORD_CHANGE_MOBILE;
  const newPassword = process.env.DEV_PASSWORD_CHANGE_VALUE;

  if (!mobile || !newPassword) {
    throw new Error('Missing password change configuration');
  }

  const passwordHash = await hashPassword(newPassword);

  const result : any = await sql`
    UPDATE users
    SET
      password_hash = ${passwordHash},
      password_changed_at = NOW(),
      updated_at = NOW()
    WHERE mobile = ${mobile}
    RETURNING id, display_name, role
  `;

  if (!result.length) {
    throw new Error('User not found');
  }

  // Invalidate existing login sessions after password change
  await sql`
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE user_id = ${result[0].id}
      AND revoked_at IS NULL
  `;

  console.log('Password changed for:', result[0].display_name);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end();
}