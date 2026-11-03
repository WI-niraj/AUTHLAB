import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './password.service.js';
import { acceptedMessage } from '../common/helpers.js';
import type { MobileBody, MobileCodeBody, ResetPasswordBody } from '../common/types.js';

export async function forgotPassword(req: FastifyRequest<{ Body: MobileBody }>, reply: FastifyReply) {
  await service.forgotPassword(req.body.mobile, req.ip);
  return reply.code(202).send(acceptedMessage);
}
export async function verifyResetOtp(req: FastifyRequest<{ Body: MobileCodeBody }>) {
  return service.verifyResetOtp(req.body, req.ip);
}
export async function resetPassword(req: FastifyRequest<{ Body: ResetPasswordBody }>) {
  await service.resetPassword(req.body, req.ip);
  return { message: 'Password reset. Please sign in again.' };
}
