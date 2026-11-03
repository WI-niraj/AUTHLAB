
import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import { sql } from '../db/client.js';
import { readCookie, failure } from '../lib/http.js';
import { randomToken, sha256 } from '../lib/security.js';

const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  display_name: string;
  mobile: string;
  mobile_verified_at: Date | null;
  session_id: string;
}

export async function createSession(
  userId: string,
  userAgent?: string
): Promise<string> {
  const token = randomToken();
  const tokenHash = sha256(token);

  await sql`
    INSERT INTO sessions (
      id,
      user_id,
      token_hash,
      user_agent,
      expires_at
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      ${tokenHash},
      ${userAgent ?? null},
      NOW() + (${SESSION_DAYS} * INTERVAL '1 day')
    )
  `;

  // Only its SHA-256 hash is stored in PostgreSQL.
  return token;
}

export async function currentSession(
  req: FastifyRequest
): Promise<SessionUser | null> {
  const token = readCookie(req);

  if (!token) {
    return null;
  }

  const tokenHash = sha256(token);

  const rows = await sql`
    SELECT
      u.id,
      u.display_name,
      u.mobile,
      u.mobile_verified_at,
      s.id AS session_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND u.status = 'active'
    LIMIT 1
  `;

  const user = rows[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    display_name: user.display_name,
    mobile: user.mobile,
    mobile_verified_at: user.mobile_verified_at,
    session_id: user.session_id,
  };
}

export async function requireSession(
  req: FastifyRequest
): Promise<SessionUser> {
  const user = await currentSession(req);

  if (!user) {
    failure(
      401,
      'UNAUTHORIZED',
      'Please sign in to continue'
    );
  }

  return user;
}

export async function revokeAll(
  userId: string
): Promise<void> {
  await sql`
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
  `;
}
