import type { FastifyRequest } from 'fastify';
import { failure } from '../../lib/http.js';
import { requireSuperAdmin } from './admin.guard.js';
import { adminService } from './admin.service.js';

type WithId = FastifyRequest<{ Params: { id: string } }>;

export async function stats(req: FastifyRequest) {
  await requireSuperAdmin(req);
  return adminService.stats();
}

export async function listUsers(req: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string } }>) {
  await requireSuperAdmin(req);
  const page = Number(req.query.page ?? '1');
  const limit = Number(req.query.limit ?? '20');
  const search = (req.query.search ?? '').trim();
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || search.length > 100) {
    failure(400, 'INVALID_QUERY', 'Invalid pagination or search parameters');
  }
  return adminService.listUsers(page, limit, search);
}

export async function getUser(req: WithId) {
  await requireSuperAdmin(req);
  return adminService.getUser(req.params.id);
}

export async function userSessions(req: WithId) {
  await requireSuperAdmin(req);
  return adminService.userSessions(req.params.id);
}

export async function logoutAll(req: WithId) {
  const actor = await requireSuperAdmin(req);
  return adminService.logoutAll(actor.id, req.params.id);
}

export async function disableUser(req: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>) {
  const actor = await requireSuperAdmin(req);
  const reason = req.body?.reason?.trim();
  if (!reason || reason.length > 500) failure(400, 'INVALID_REASON', 'Reason must be 1-500 characters');
  return adminService.changeStatus(actor.id, req.params.id, true, reason);
}

export async function enableUser(req: WithId) {
  const actor = await requireSuperAdmin(req);
  return adminService.changeStatus(actor.id, req.params.id, false);
}
