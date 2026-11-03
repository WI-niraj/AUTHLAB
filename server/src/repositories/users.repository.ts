import { sql } from '../db/client.js';

export const usersRepository = {
  async create(id: string, displayName: string, mobile: string, passwordHash: string) {
    return sql`INSERT INTO users (id, display_name, mobile, password_hash)
      VALUES (${id}, ${displayName}, ${mobile}, ${passwordHash})
      ON CONFLICT (mobile) DO NOTHING RETURNING id`;
  },
  findPendingByMobile(mobile: string) {
    return sql`SELECT id FROM users WHERE mobile=${mobile} AND status='pending'`;
  },
  findActiveByMobile(mobile: string) {
    return sql`SELECT id FROM users WHERE mobile=${mobile} AND status='active'`;
  },
  findForLogin(mobile: string) {
    return sql`SELECT id, password_hash, status FROM users WHERE mobile=${mobile}`;
  },
  findActivePassword(id: string) {
    return sql`SELECT password_hash FROM users WHERE id=${id} AND status='active'`.then(rows => rows[0]);
  },
  activate(id: string) {
    return sql`UPDATE users SET status='active', mobile_verified_at=now(), updated_at=now()
      WHERE id=${id} AND status='pending'`;
  },
  isMobileTaken(mobile: string) {
    return sql`SELECT 1 FROM users WHERE mobile=${mobile}`;
  },
  // These mutations stay in the caller's transaction for atomic revocation.
};
