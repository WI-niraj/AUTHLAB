
import { sql } from '../db/client.js';
import { sha256 } from '../lib/security.js';
import type { LoginMetadata } from '../service/geo.service.js';

export const sessionsRepository = {

  create(
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: LoginMetadata
  ) {
    return sql`
      INSERT INTO sessions (
        id,
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address,
        last_ip_address,
        country_code,
        country_name,
        region,
        city,
        browser_name,
        os_name,
        device_type
      )
      VALUES (
        ${id},
        ${userId},
        ${tokenHash},
        ${expiresAt},
        ${metadata.userAgent},
        ${metadata.ipAddress},
        ${metadata.ipAddress},
        ${metadata.countryCode},
        ${metadata.countryName},
        ${metadata.region},
        ${metadata.city},
        ${metadata.browserName},
        ${metadata.osName},
        ${metadata.deviceType}
      )
      RETURNING id
    `;
  },

  revokeToken(token: string) {
    return sql`
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE token_hash = ${sha256(token)}
        AND revoked_at IS NULL
    `;
  },

  listActive(userId: string) {
    return sql`
      SELECT
        id,
        created_at,
        last_seen_at,
        expires_at,
        user_agent,
        ip_address,
        last_ip_address,
        country_code,
        country_name,
        region,
        city,
        browser_name,
        os_name,
        device_type
      FROM sessions
      WHERE user_id = ${userId}
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 50
    `;
  },

  revokeById(id: string, userId: string) {
    return sql`
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE id = ${id}
        AND user_id = ${userId}
        AND revoked_at IS NULL
      RETURNING id
    `;
  },

};
