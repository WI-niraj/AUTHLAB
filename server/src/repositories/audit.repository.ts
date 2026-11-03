import { sql } from '../db/client.js';

export const auditRepository = {
  record(event: string, userId: string | null = null) {
    return sql`INSERT INTO audit_events (user_id, event) VALUES (${userId}, ${event})`;
  },
};
