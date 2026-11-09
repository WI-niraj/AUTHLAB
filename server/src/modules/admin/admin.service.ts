import { sql } from '../../db/client.js';
import { failure } from '../../lib/http.js';
import { adminRepository } from '../../repositories/admin.repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validId(id: string) {
  if (!UUID_PATTERN.test(id)) failure(400, 'INVALID_ID', 'Invalid user or session ID');
  return id;
}

export const adminService = {
  stats: () => adminRepository.stats(),
  listUsers: (page: number, limit: number, search: string) => adminRepository.listUsers(page, limit, search),
  getUser: (id: string) => adminRepository.getUser(validId(id)),
  userSessions: async (id: string) => {
    validId(id);
    await adminRepository.getUser(id);
    return adminRepository.userSessions(id);
  },

  async logoutAll(actorId: string, targetId: string) {
    validId(targetId);
    if (actorId === targetId) failure(403, 'FORBIDDEN', 'Cannot manage your own admin account');
    const count = await sql.begin(async tx => {
      const [target] = await tx`SELECT id, role FROM users WHERE id = ${targetId} FOR UPDATE`;
      if (!target) failure(404, 'NOT_FOUND', 'User not found');
      if (target.role !== 'user') failure(403, 'FORBIDDEN', 'Cannot manage privileged accounts');
      const revoked = await tx`
        UPDATE sessions SET revoked_at = now()
        WHERE user_id = ${targetId} AND revoked_at IS NULL
        RETURNING id
      `;
      await tx`
        INSERT INTO audit_events (user_id, actor_user_id, target_user_id, event, metadata)
        VALUES (${targetId}, ${actorId}, ${targetId}, 'admin_force_logout', ${tx.json({ revokedSessions: revoked.length })})
      `;
      return revoked.length;
    });
    return { message: 'User sessions revoked', revokedSessions: count };
  },

  async changeStatus(actorId: string, targetId: string, disabled: boolean, reason?: string) {
    validId(targetId);
    if (actorId === targetId) failure(403, 'FORBIDDEN', 'Cannot change your own admin account');
    return sql.begin(async tx => {
      const [target] = await tx`SELECT id, role FROM users WHERE id = ${targetId} FOR UPDATE`;
      if (!target) failure(404, 'NOT_FOUND', 'User not found');
      if (target.role !== 'user') failure(403, 'FORBIDDEN', 'Cannot manage privileged accounts');
      if (disabled) {
        await tx`
          UPDATE users SET status = 'disabled', disabled_at = now(),
            disabled_reason = ${reason ?? null}, updated_at = now()
          WHERE id = ${targetId}
        `;
        await tx`UPDATE sessions SET revoked_at = now() WHERE user_id = ${targetId} AND revoked_at IS NULL`;
      } else {
        await tx`
          UPDATE users SET status = 'active', disabled_at = NULL,
            disabled_reason = NULL, updated_at = now()
          WHERE id = ${targetId} AND mobile_verified_at IS NOT NULL
        `;
        const [updated] = await tx`SELECT status FROM users WHERE id = ${targetId}`;
        if (!updated) {
          failure(404, 'USER_NOT_FOUND', 'User not found');
        }

        if (updated.status !== 'active') {
          failure(409, 'NOT_VERIFIED', 'Mobile verification required');
        }
      }
      await tx`
        INSERT INTO audit_events (user_id, actor_user_id, target_user_id, event, metadata)
        VALUES (${targetId}, ${actorId}, ${targetId},
          ${disabled ? 'admin_disabled_user' : 'admin_enabled_user'},
          ${tx.json({ reason: disabled ? reason ?? '' : '' })})
      `;
      return { message: disabled ? 'Account disabled' : 'Account enabled' };
    });
  },
};
