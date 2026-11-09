
import type { FastifyRequest } from 'fastify';
import { requireSession } from '../../service/session.service.js';
import { sessionsRepository } from '../../repositories/sessions.repository.js';
import { failure } from '../../lib/http.js';

export async function listSessions(req: FastifyRequest) {
  const user = await requireSession(req);

  const rows = await sessionsRepository.listActive(user.id);

  return rows.map((session) => ({
    id: session.id,

    created_at: session.created_at,
    last_seen_at: session.last_seen_at,
    expires_at: session.expires_at,

    user_agent: session.user_agent,
    browser_name: session.browser_name,
    os_name: session.os_name,
    device_type: session.device_type,

    ip_address: session.ip_address,
    last_ip_address: session.last_ip_address,

    country_code: session.country_code,
    country_name: session.country_name,
    region: session.region,
    city: session.city,

    current: session.id === user.session_id,
  }));
}

export async function revokeSession(
  req: FastifyRequest,
  id: string
) {
  const user = await requireSession(req);

  const rows = await sessionsRepository.revokeById(
    id,
    user.id
  );

  if (!rows.length) {
    failure(
      404,
      'NOT_FOUND',
      'Session not found'
    );
  }

  return id === user.session_id;
}
