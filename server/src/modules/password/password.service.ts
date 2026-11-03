import { sql } from '../../db/client.js';
import { usersRepository } from '../../repositories/users.repository.js';
import { resetGrantsRepository } from '../../repositories/reset-grants.repository.js';
import { auditRepository } from '../../repositories/audit.repository.js';
import { createOtp, consumeOtp } from '../../service/opt.service.js';
import { limit } from '../../lib/limiter.js';
import { failure } from '../../lib/http.js';
import { hashPassword, randomToken, sha256 } from '../../lib/security.js';
import { ensureStrongPassword } from '../common/helpers.js';
import type { MobileCodeBody, ResetPasswordBody } from '../common/types.js';

export async function forgotPassword(mobile: string, ip: string) {
  await limit('forgot-ip', ip, 8, 3600);
  await limit('forgot-mobile', mobile, 3, 3600);
  const users = await usersRepository.findActiveByMobile(mobile);
  if (users[0]) {
    await createOtp(users[0].id, mobile, 'reset_password');
    await auditRepository.record('password_reset_requested', users[0].id);
  }
}
export async function verifyResetOtp(body: MobileCodeBody, ip: string) {
  await limit('reset-verify-ip', ip, 20, 3600);
  await limit('reset-verify-mobile', body.mobile, 8, 3600);
  const users = await usersRepository.findActiveByMobile(body.mobile);
  if (!users[0] || !(await consumeOtp(users[0].id, body.mobile, 'reset_password', body.code))) {
    failure(400, 'INVALID_OTP', 'Code is invalid or expired');
  }
  const token = randomToken();
  await resetGrantsRepository.create(users[0].id, sha256(token));
  return { resetToken: token, expiresIn: 600 };
}
export async function resetPassword(body: ResetPasswordBody, ip: string) {
  ensureStrongPassword(body.newPassword);
  await limit('reset-password-ip', ip, 15, 3600);
  const digest = sha256(body.resetToken);
  const hash = await hashPassword(body.newPassword);
  const updated = await sql.begin(async tx => {
    const grants = await tx`SELECT id, user_id FROM reset_grants
      WHERE token_hash=${digest} AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`;
    if (!grants[0]) return false;
    await tx`UPDATE users SET password_hash=${hash}, updated_at=now() WHERE id=${grants[0].user_id}`;
    await tx`UPDATE reset_grants SET consumed_at=now()
      WHERE user_id=${grants[0].user_id} AND consumed_at IS NULL`;
    await tx`UPDATE sessions SET revoked_at=now()
      WHERE user_id=${grants[0].user_id} AND revoked_at IS NULL`;
    return true;
  });
  if (!updated) failure(400, 'INVALID_RESET_TOKEN', 'Reset authorization invalid or expired');
}
