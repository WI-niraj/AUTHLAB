import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './auth.service.js';
import { acceptedMessage } from '../common/helpers.js';
import { clearSessionCookie, readCookie, setSessionCookie } from '../../lib/http.js';
import type { RegisterBody, MobileBody, MobileCodeBody, LoginBody } from '../common/types.js';

export async function register(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
  await service.register(req.body, req.ip);
  return reply.code(202).send(acceptedMessage);
}
export async function verifyMobile(req: FastifyRequest<{ Body: MobileCodeBody }>) {
  await service.verifyMobile(req.body, req.ip);
  return { message: 'Mobile verified. You may sign in.' };
}
export async function resendOtp(req: FastifyRequest<{ Body: MobileBody }>, reply: FastifyReply) {
  await service.resendOtp(req.body.mobile, req.ip);
  return reply.code(202).send(acceptedMessage);
}
export async function login(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
  const token = await service.login(req.body, req.ip, req.headers['user-agent'], readCookie(req));
  setSessionCookie(reply, token);
  return { message: 'Signed in' };
}
export async function me(req: FastifyRequest) {
  return { user: await service.currentUser(req) };
}
export async function logout(req: FastifyRequest, reply: FastifyReply) {
  await service.logout(readCookie(req));
  clearSessionCookie(reply);
  return { message: 'Signed out' };
}
