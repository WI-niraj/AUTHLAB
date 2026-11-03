import type { FastifyRequest } from 'fastify';
import { failure } from '../../lib/http.js';
import { validPassword, verifyPassword } from '../../lib/security.js';
import { usersRepository } from '../../repositories/users.repository.js';

export const acceptedMessage = { message: 'If the account is eligible, the request has been processed.' };
export const requestIp = (req: FastifyRequest) => req.ip;

export function ensureStrongPassword(password: string) {
  if (!validPassword(password)) {
    failure(400, 'WEAK_PASSWORD', 'Password must have 12–128 characters, including letters and numbers');
  }
}

export async function verifyCurrentPassword(userId: string, password: string) {
  const user = await usersRepository.findActivePassword(userId);
  if (!user || !(await verifyPassword(user.password_hash, password))) {
    failure(403, 'REAUTH_REQUIRED', 'Current password is incorrect');
  }
}
