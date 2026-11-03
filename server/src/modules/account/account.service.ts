import type { FastifyRequest } from 'fastify';
import { sql } from '../../db/client.js';
import { usersRepository } from '../../repositories/users.repository.js';
import { auditRepository } from '../../repositories/audit.repository.js';
import { requireSession } from '../../service/session.service.js';
import { createOtp, consumeOtp } from '../../service/opt.service.js';
import { limit } from '../../lib/limiter.js';
import { failure } from '../../lib/http.js';
import { hashPassword } from '../../lib/security.js';
import { ensureStrongPassword, verifyCurrentPassword } from '../common/helpers.js';
import type { ChangePasswordBody, ChangeMobileBody, ConfirmMobileBody } from '../common/types.js';

export async function changePassword(req: FastifyRequest, body: ChangePasswordBody) {
  const user = await requireSession(req);
  await limit('change-password-user', user.id, 5, 3600);
  ensureStrongPassword(body.newPassword);
  await verifyCurrentPassword(user.id, body.currentPassword);
  if (body.currentPassword === body.newPassword) failure(400, 'SAME_PASSWORD', 'Choose a different password');
  const hash = await hashPassword(body.newPassword);
  await sql.begin(async tx => {
    await tx`UPDATE users SET password_hash=${hash}, updated_at=now() WHERE id=${user.id}`;
    await tx`UPDATE sessions SET revoked_at=now() WHERE user_id=${user.id} AND revoked_at IS NULL`;
  });
  await auditRepository.record('password_changed', user.id);
}
export async function requestMobileChange(req: FastifyRequest, body: ChangeMobileBody) {
  const user = await requireSession(req);
  await limit('mobile-change-user', user.id, 4, 3600);
  await verifyCurrentPassword(user.id, body.currentPassword);
  if (user.mobile === body.newMobile) failure(400, 'SAME_MOBILE', 'Enter a different number');
  const taken = await usersRepository.isMobileTaken(body.newMobile);
  if (taken.length) failure(409, 'MOBILE_UNAVAILABLE', 'Mobile number unavailable');
  await createOtp(user.id, body.newMobile, 'change_mobile');
  await auditRepository.record('mobile_change_requested', user.id);
}
export async function confirmMobileChange(req: FastifyRequest, body: ConfirmMobileBody) {
  const user = await requireSession(req);
  await limit('mobile-confirm-user', user.id, 8, 3600);
  if (!(await consumeOtp(user.id, body.newMobile, 'change_mobile', body.code))) {
    failure(400, 'INVALID_OTP', 'Code is invalid or expired');
  }
  try {
    await sql.begin(async tx => {
      await tx`UPDATE users SET mobile=${body.newMobile}, mobile_verified_at=now(), updated_at=now() WHERE id=${user.id}`;
      await tx`UPDATE sessions SET revoked_at=now() WHERE user_id=${user.id} AND revoked_at IS NULL`;
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      failure(409, 'MOBILE_UNAVAILABLE', 'Mobile number unavailable');
    }
    throw error;
  }
  await auditRepository.record('mobile_changed', user.id);
}
