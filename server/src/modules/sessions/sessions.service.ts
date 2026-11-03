import type { FastifyRequest } from 'fastify';
import { requireSession } from '../../service/session.service.js';
import { sessionsRepository } from '../../repositories/sessions.repository.js';
import { failure } from '../../lib/http.js';

export async function listSessions(req: FastifyRequest) {
  const user = await requireSession(req);
  const rows = await sessionsRepository.listActive(user.id);
  return rows.map(session => ({ ...session, current: session.id === user.session_id }));
}
export async function revokeSession(req: FastifyRequest, id: string) {
  const user = await requireSession(req);
  const rows = await sessionsRepository.revokeById(id, user.id);
  if (!rows.length) failure(404, 'NOT_FOUND', 'Session not found');
  return id === user.session_id;
}
