import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { usersRepository } from '../../repositories/users.repository.js';
import { sessionsRepository } from '../../repositories/sessions.repository.js';
import { auditRepository } from '../../repositories/audit.repository.js';
import { createOtp, consumeOtp } from '../../service/opt.service.js';
import { createSession, requireSession } from '../../service/session.service.js';
import { getLoginMetadata } from '../../service/geo.service.js';
import { limit } from '../../lib/limiter.js';
import { failure } from '../../lib/http.js';
import {
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../../lib/security.js';
import { ensureStrongPassword } from '../common/helpers.js';
import type {
  LoginBody,
  MobileCodeBody,
  RegisterBody,
} from '../common/types.js';

export async function register(body: RegisterBody, ip: string) {
  ensureStrongPassword(body.password);

  await limit('register-ip', ip, 8, 3600);
  await limit('register-mobile', body.mobile, 3, 3600);

  const hash = await hashPassword(body.password);
  const id = randomUUID();

  const rows = await usersRepository.create(
    id,
    body.displayName.trim(),
    body.mobile,
    hash
  );

  if (rows.length) {
    await createOtp(id, body.mobile, 'register');
    await auditRepository.record('registration_started', id);
  }
}

export async function verifyMobile(body: MobileCodeBody, ip: string) {
  await limit('verify-ip', ip, 25, 3600);
  await limit('verify-mobile', body.mobile, 8, 3600);

  const rows = await usersRepository.findPendingByMobile(body.mobile);

  if (
    !rows[0] ||
    !(await consumeOtp(
      rows[0].id,
      body.mobile,
      'register',
      body.code
    ))
  ) {
    failure(400, 'INVALID_OTP', 'Code is invalid or expired');
  }

  await usersRepository.activate(rows[0].id);

  await auditRepository.record('mobile_verified', rows[0].id);
}

export async function resendOtp(mobile: string, ip: string) {
  await limit('resend-ip', ip, 8, 3600);
  await limit('resend-mobile', mobile, 3, 3600);

  const rows = await usersRepository.findPendingByMobile(mobile);

  if (rows[0]) {
    await createOtp(rows[0].id, mobile, 'register');
  }
}

export async function login(
  body: LoginBody,
  ip: string,
  userAgent: string | undefined,
  oldToken?: string
) {
  await limit('login-ip', ip, 25, 900);
  await limit('login-mobile', body.mobile, 8, 900);

  const rows = await usersRepository.findForLogin(body.mobile);
  const user = rows[0];

  const valid = await verifyPassword(
    user?.password_hash ?? await dummyPasswordHash,
    body.password
  );

  if (!user || !valid || user.status !== 'active') {
    failure(
      401,
      'INVALID_CREDENTIALS',
      'Invalid mobile number or password'
    );
  }

  if (oldToken) {
    await sessionsRepository.revokeToken(oldToken);
  }

  const metadata = getLoginMetadata(ip, userAgent);

  console.log('Login metadata:', {
    ipAddress: metadata.ipAddress,
    country: metadata.countryName,
    city: metadata.city,
    browser: metadata.browserName,
    os: metadata.osName,
    device: metadata.deviceType,
  });

  const token = await createSession(user.id, metadata);

  await auditRepository.record('login_success', user.id);

  return token;
}

export async function currentUser(req: FastifyRequest) {
  const user = await requireSession(req);

  return {
    id: user.id,
    displayName: user.display_name,
    mobile: user.mobile,
    mobileVerified: !!user.mobile_verified_at,
    role: user.role,
  };
}

export async function logout(token?: string) {
  if (token) {
    await sessionsRepository.revokeToken(token);
  }
}
