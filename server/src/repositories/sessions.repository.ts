import { sql } from '../db/client.js';
import { sha256 } from '../lib/security.js';

export const sessionsRepository = {
  revokeToken(token: string) {
    return sql`UPDATE sessions SET revoked_at=now()
      WHERE token_hash=${sha256(token)} AND revoked_at IS NULL`;
  },
  listActive(userId: string) {
    return sql`SELECT id, created_at, last_seen_at, expires_at, user_agent FROM sessions
      WHERE user_id=${userId} AND revoked_at IS NULL AND expires_at>now()
      ORDER BY created_at DESC LIMIT 50`;
  },
  revokeById(id: string, userId: string) {
    return sql`UPDATE sessions SET revoked_at=now()
      WHERE id=${id} AND user_id=${userId} AND revoked_at IS NULL RETURNING id`;
  },
};
