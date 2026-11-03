import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './sessions.service.js';
import { clearSessionCookie } from '../../lib/http.js';

export async function listSessions(req: FastifyRequest) {
  return { sessions: await service.listSessions(req) };
}
export async function revokeSession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const current = await service.revokeSession(req, req.params.id);
  if (current) clearSessionCookie(reply);
  return { message: 'Session revoked' };
}
