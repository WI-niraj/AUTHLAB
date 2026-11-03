import type { FastifyReply, FastifyRequest } from 'fastify';
import { clearSessionCookie } from '../../lib/http.js';
import * as service from './account.service.js';
import type { ChangePasswordBody, ChangeMobileBody, ConfirmMobileBody } from '../common/types.js';

export async function changePassword(req: FastifyRequest<{ Body: ChangePasswordBody }>, reply: FastifyReply) {
  await service.changePassword(req, req.body);
  clearSessionCookie(reply);
  return { message: 'Password changed. Sign in again.' };
}
export async function requestMobileChange(req: FastifyRequest<{ Body: ChangeMobileBody }>) {
  await service.requestMobileChange(req, req.body);
  return { message: 'Verification code sent to new number.' };
}
export async function confirmMobileChange(req: FastifyRequest<{ Body: ConfirmMobileBody }>, reply: FastifyReply) {
  await service.confirmMobileChange(req, req.body);
  clearSessionCookie(reply);
  return { message: 'Mobile updated. Sign in again.' };
}
