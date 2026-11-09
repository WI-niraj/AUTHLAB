import { sql } from '../db/client.js';
import { failure } from '../lib/http.js';

export const adminRepository = {
  async stats() {
    const [rows] = await sql`
      SELECT
        (SELECT count(*)::int FROM users) AS "totalUsers",
        (SELECT count(*)::int FROM users WHERE status = 'disabled') AS "disabledUsers",
        (SELECT count(*)::int FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active') AS "activeSessions",
        (SELECT count(DISTINCT s.user_id)::int FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'
            AND s.last_seen_at >= now() - interval '5 minutes') AS "onlineUsers"
    `;
    return rows;
  },

  async listUsers(page: number, limit: number, search: string) {
    const term = `%${search}%`;
    const countRows = await sql`
  SELECT COUNT(*)::int AS total
  FROM users
`;

    const total = Number(countRows[0]?.total ?? 0);
    const users = await sql`
      SELECT u.id, u.display_name AS "displayName", u.mobile, u.role, u.status,
        (u.mobile_verified_at IS NOT NULL) AS "mobileVerified",
        u.created_at AS "createdAt", max(s.last_seen_at) AS "lastSeenAt",
        count(s.id)::int AS "activeSessions"
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()
      WHERE (${search} = '' OR u.display_name ILIKE ${term} OR u.mobile ILIKE ${term})
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;
    return { users, total, page, limit };
  },

  async getUser(id: string) {
    const [user] = await sql`
      SELECT u.id, u.display_name AS "displayName", u.mobile, u.role, u.status,
        (u.mobile_verified_at IS NOT NULL) AS "mobileVerified",
        u.created_at AS "createdAt", max(s.last_seen_at) AS "lastSeenAt",
        count(s.id)::int AS "activeSessions"
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()
      WHERE u.id = ${id}
      GROUP BY u.id
    `;
    if (!user) failure(404, 'NOT_FOUND', 'User not found');
    return { user };
  },

  async userSessions(id: string) {
    const sessions = await sql`
      SELECT s.id, s.user_id AS "userId", s.ip_address::text AS "ipAddress",
        s.country_name AS "countryName", s.city, s.browser_name AS "browserName",
        s.os_name AS "osName", s.device_type AS "deviceType", s.user_agent AS "userAgent",
        s.created_at AS "createdAt", s.last_seen_at AS "lastSeenAt",
        s.expires_at AS "expiresAt", s.revoked_at AS "revokedAt"
      FROM sessions s WHERE s.user_id = ${id}
      ORDER BY s.created_at DESC LIMIT 100
    `;
    return { sessions };
  },
};
