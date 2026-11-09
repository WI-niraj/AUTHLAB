
import type { FastifyRequest } from 'fastify';
import { requireSession } from '../../service/session.service.js';
import { failure } from '../../lib/http.js';

export async function requireAdmin(req: FastifyRequest) {
  const user = await requireSession(req);

  if (
    user.role !== 'admin' &&
    user.role !== 'super_admin'
  ) {
    failure(403, 'FORBIDDEN', 'Admin access required');
  }

  return user;
}

export async function requireSuperAdmin(req: FastifyRequest) {
  const user = await requireSession(req);

  if (user.role !== 'super_admin') {
    failure(
      403,
      'FORBIDDEN',
      'Super Admin access required'
    );
  }

  return user;
}
