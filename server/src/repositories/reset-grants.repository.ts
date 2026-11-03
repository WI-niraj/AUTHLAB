import { randomUUID } from 'node:crypto';
import { sql } from '../db/client.js';

export const resetGrantsRepository = {
  create(userId: string, hashedToken: string) {
    return sql`INSERT INTO reset_grants (id, user_id, token_hash, expires_at)
      VALUES (${randomUUID()}, ${userId}, ${hashedToken}, now() + interval '10 minutes')`;
  },
};
